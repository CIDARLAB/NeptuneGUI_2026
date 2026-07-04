"""
Neptune compute service — runs on Modal.
Wraps the fluigi CLI (Neptune_2026) and the 3DuF primitives server.

Deploy:   modal deploy modal_app.py
Dev/test: modal serve modal_app.py

Compile requests carry a per-job componentBundle (JSON + LFR/MINT). Fluigi
receives it as:
  --component-library <tmpdir>/.../JSON   # geometry / defaults / terminals
  --pre-load <tmpdir>/.../LFR             # LFR import module search
Primitives server is the fallback for entities not present in the bundle.

Primitives lifecycle (container-scoped reuse):
  - First compile job in a container starts 3DuF on localhost:6060.
  - Later jobs in the same container reuse that process (no restart tax).
  - Process dies when Modal recycles the container — no global always-on service.
"""

import os
import subprocess
import tempfile
import threading
import time
import uuid
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

import modal
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Container image
# Includes: Python (fluigi + deps), Node.js (3DuF primitives server)
# ---------------------------------------------------------------------------

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "graphviz",
        "libgraphviz-dev",
        "libcairo2-dev",
        "pkg-config",
        "python3-dev",
        "build-essential",
        "git",
        "curl",
        "openjdk-17-jre-headless",
    )
    # Node.js 18 (for 3DuF primitives server)
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
        "apt-get install -y nodejs",
    )
    # Neptune_2026 — private repo, needs GITHUB_TOKEN build secret
    # Secret name: neptune-github
    .run_commands(
        "git clone https://oauth2:$GITHUB_TOKEN@github.com/CIDARLAB/Neptune_2026.git"
        " /neptune --recurse-submodules -j4 --depth 1",
        secrets=[modal.Secret.from_name("neptune-github")],
    )
    # Install fluigi and its Python deps, plus FastAPI for the web endpoint
    .run_commands(
        "pip install poetry fastapi uvicorn",
        "cd /neptune && poetry config virtualenvs.create false && poetry install --without dev",
    )
    # 3DuF primitives server — public repo
    .run_commands(
        "git clone --depth 1 https://github.com/CIDARLAB/3DuF.git /3duf",
        "cd /3duf/src/server && npm ci",
    )
)

app = modal.App("neptune-compute", image=image)

# ---------------------------------------------------------------------------
# Persistent job store — survives across container restarts
# ---------------------------------------------------------------------------

job_store = modal.Dict.from_name("neptune-jobs", create_if_missing=True)

PRIMITIVES_PORT = 6060
PRIMITIVES_URI = f"http://localhost:{PRIMITIVES_PORT}"

# Container-local singleton: one 3DuF process shared by all jobs in this worker.
_primitives_lock = threading.Lock()
_primitives_proc: subprocess.Popen | None = None


def _sanitize_syntax(syntax: str) -> str:
    return re.sub(r"[^a-z0-9_-]", "", str(syntax or "").strip().lower())


def write_component_bundle(tmpdir: Path, bundle: list) -> dict | None:
    """Write compile-time component library snapshot for fluigi.

    Layout (mirrors NeptuneGUI Data/3DuF_component/default/):
      <root>/JSON/<syntax>.json
      <root>/LFR/<syntax>.lfr
      <root>/MINT/<syntax>.mint

    Returns path metadata when at least one JSON or LFR file was written.
    """
    if not bundle:
        return None

    root = tmpdir / "3DuF_component" / "default"
    json_dir = root / "JSON"
    lfr_dir = root / "LFR"
    mint_dir = root / "MINT"
    for directory in (json_dir, lfr_dir, mint_dir):
        directory.mkdir(parents=True, exist_ok=True)

    json_count = 0
    lfr_count = 0
    mint_count = 0
    for item in bundle:
        if not isinstance(item, dict):
            continue
        syntax = _sanitize_syntax(item.get("syntax") or item.get("name"))
        if not syntax:
            continue

        json_script = item.get("jsonScript") or item.get("json_script") or ""
        if str(json_script).strip():
            (json_dir / f"{syntax}.json").write_text(str(json_script), encoding="utf-8")
            json_count += 1

        lfr_script = item.get("lfrScript") or item.get("lfr_script") or ""
        if str(lfr_script).strip():
            (lfr_dir / f"{syntax}.lfr").write_text(str(lfr_script), encoding="utf-8")
            lfr_count += 1

        mint_script = item.get("mintScript") or item.get("mint_script") or ""
        if str(mint_script).strip():
            (mint_dir / f"{syntax}.mint").write_text(str(mint_script), encoding="utf-8")
            mint_count += 1

    manifest = tmpdir / "component_library.json"
    manifest.write_text(json.dumps({"components": bundle}, indent=2), encoding="utf-8")

    if json_count == 0 and lfr_count == 0:
        return None

    return {
        "root": root,
        "json_dir": json_dir,
        "lfr_dir": lfr_dir,
        "mint_dir": mint_dir,
        "json_count": json_count,
        "lfr_count": lfr_count,
        "mint_count": mint_count,
        "manifest": manifest,
    }


def _primitives_http_ok() -> bool:
    try:
        urllib.request.urlopen(PRIMITIVES_URI, timeout=1)
        return True
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def _spawn_primitives_server() -> subprocess.Popen:
    """Start 3DuF and block until it accepts HTTP (or give up after 30s)."""
    primitives_env = {**os.environ, "PORT": str(PRIMITIVES_PORT)}
    proc = subprocess.Popen(
        ["./node_modules/.bin/ts-node", "server.ts"],
        cwd="/3duf/src/server",
        env=primitives_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.time() + 30
    while time.time() < deadline:
        if proc.poll() is not None:
            break
        if _primitives_http_ok():
            return proc
        time.sleep(0.4)
    return proc


def _primitives_alive() -> bool:
    """True when the container-local process is running and serving HTTP."""
    global _primitives_proc
    if _primitives_proc is None:
        return False
    if _primitives_proc.poll() is not None:
        _primitives_proc = None
        return False
    return _primitives_http_ok()


def ensure_primitives_server() -> bool:
    """Ensure 3DuF is up in this container. Returns True if an existing process was reused."""
    global _primitives_proc
    with _primitives_lock:
        if _primitives_alive():
            return True

        if _primitives_proc is not None:
            try:
                _primitives_proc.kill()
            except OSError:
                pass
            _primitives_proc = None

        _primitives_proc = _spawn_primitives_server()
        return False


def build_fluigi_cmd(
    compile_type: str,
    src_path: Path,
    output_dir: Path,
    component_paths: dict | None,
) -> list[str]:
    """Build fluigi CLI with component-library / pre-load from the bundle."""
    if compile_type == "lfr":
        cmd = ["fluigi", "synthesize", "-o", str(output_dir), str(src_path)]
    else:
        cmd = ["fluigi", "synthesizeFromMINT", "-o", str(output_dir), str(src_path)]

    if not component_paths:
        return cmd

    # Geometry / defaults / terminals (overrides repo user_components/ on clash).
    if component_paths.get("json_count"):
        cmd.extend(["--component-library", str(component_paths["json_dir"])])

    # LFR module import search (only used by synthesize / compile_lfr).
    if compile_type == "lfr" and component_paths.get("lfr_count"):
        cmd.extend(["--pre-load", str(component_paths["lfr_dir"])])

    return cmd


# ---------------------------------------------------------------------------
# Compute function — spawned once per compile request
# Runs in its own container with a long timeout
# ---------------------------------------------------------------------------


@app.function(timeout=3600, cpu=4.0)
def run_compile(
    job_id: str,
    source_content: str,
    source_filename: str,
    config_content: str,
    config_filename: str,
    compile_type: str,
    component_bundle: list | None = None,
):
    """Execute a fluigi compile job. Stores result in job_store.

    Primitives server is reused for the lifetime of this container (not
    started/stopped per job). Do not terminate it here.
    """

    # Fallback for entities not present (or incomplete) in componentBundle.
    primitives_reused = ensure_primitives_server()

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            output_dir = tmppath / "output"
            output_dir.mkdir()

            src_path = tmppath / source_filename
            src_path.write_text(source_content, encoding="utf-8")

            if config_content:
                cfg_path = tmppath / config_filename
                cfg_path.write_text(config_content, encoding="utf-8")

            component_paths = write_component_bundle(tmppath, component_bundle or [])

            env = {
                **os.environ,
                "PRIMITIVE_SERVER_URI": PRIMITIVES_URI,
            }

            cmd = build_fluigi_cmd(compile_type, src_path, output_dir, component_paths)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd="/neptune",
                env=env,
                timeout=3500,
            )

            # Collect output files (JSON layout results)
            outputs: dict = {}
            for f in output_dir.rglob("*"):
                if f.is_file():
                    try:
                        outputs[str(f.relative_to(output_dir))] = f.read_text(encoding="utf-8")
                    except Exception:
                        pass

            if component_paths is not None:
                try:
                    outputs["component_library.json"] = component_paths["manifest"].read_text(
                        encoding="utf-8"
                    )
                except Exception:
                    pass

            job_store[job_id] = {
                "status": "done" if result.returncode == 0 else "error",
                "returncode": result.returncode,
                "stdout": result.stdout[-20000:],
                "stderr": result.stderr[-5000:],
                "outputs": outputs,
                "componentCount": len(component_bundle or []),
                "componentJsonCount": (component_paths or {}).get("json_count", 0),
                "componentLfrCount": (component_paths or {}).get("lfr_count", 0),
                "primitivesReused": primitives_reused,
                "fluigiCmd": cmd,
            }

    except subprocess.TimeoutExpired:
        job_store[job_id] = {"status": "error", "error": "compile timed out"}
    except Exception as exc:
        job_store[job_id] = {"status": "error", "error": str(exc)}


# ---------------------------------------------------------------------------
# Web endpoint — lightweight FastAPI app, always warm
# Matches the API shape that the Express proxy expects
# ---------------------------------------------------------------------------


@app.function()
@modal.asgi_app()
def api():
    web = FastAPI(title="Neptune Compute API")

    def _spawn(body: dict, compile_type: str) -> str:
        job_id = str(uuid.uuid4())
        job_store[job_id] = {"status": "running"}
        ext = "lfr" if compile_type == "lfr" else "mint"
        run_compile.spawn(
            job_id,
            body.get("sourceContent", ""),
            body.get("sourcefilename", f"input.{ext}"),
            body.get("configContent", ""),
            body.get("configfilename", "config.json"),
            compile_type,
            body.get("componentBundle") or [],
        )
        return job_id

    @web.post("/api/v1/mushroommapper")
    async def compile_lfr(request: Request):
        body = await request.json()
        return JSONResponse(content=_spawn(body, "lfr"))

    @web.post("/api/v1/fluigi")
    async def compile_mint(request: Request):
        body = await request.json()
        return JSONResponse(content=_spawn(body, "mint"))

    @web.get("/api/v1/jobs")
    async def list_jobs():
        # Modal Dict doesn't expose key listing; return empty — frontend polls individual jobs
        return JSONResponse(content=[])

    @web.get("/api/v1/job")
    async def get_job(id: str):
        result = job_store.get(id, {"status": "unknown"})
        return JSONResponse(content=result)

    return web
