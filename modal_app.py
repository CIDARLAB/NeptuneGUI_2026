"""
Neptune compute service — runs on Modal.
Wraps the fluigi CLI (Neptune_2026) and the 3DuF primitives server.

Deploy:   modal deploy modal_app.py
Dev/test: modal serve modal_app.py
"""

import os
import subprocess
import tempfile
import time
import uuid
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
):
    """Execute a fluigi compile job. Stores result in job_store."""

    # Start the 3DuF primitives server as a subprocess on port 6060
    primitives_env = {**os.environ, "PORT": "6060"}
    primitives_proc = subprocess.Popen(
        ["./node_modules/.bin/ts-node", "server.ts"],
        cwd="/3duf/src/server",
        env=primitives_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(4)  # Give the server a moment to start

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

            env = {
                **os.environ,
                "PRIMITIVE_SERVER_URI": "http://localhost:6060",
            }

            if compile_type == "lfr":
                cmd = ["fluigi", "synthesize", "-o", str(output_dir), str(src_path)]
            else:  # mint / uf
                cmd = ["fluigi", "synthesizeFromMINT", "-o", str(output_dir), str(src_path)]

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

            job_store[job_id] = {
                "status": "done" if result.returncode == 0 else "error",
                "returncode": result.returncode,
                "stdout": result.stdout[-20000:],
                "stderr": result.stderr[-5000:],
                "outputs": outputs,
            }

    except subprocess.TimeoutExpired:
        job_store[job_id] = {"status": "error", "error": "compile timed out"}
    except Exception as exc:
        job_store[job_id] = {"status": "error", "error": str(exc)}
    finally:
        primitives_proc.terminate()


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
