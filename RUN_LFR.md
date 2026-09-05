# Run LFR in NeptuneGUI and store output in Data

Edit LFR in the Editor, use **Save and synthesize** (full place-and-route) or **Compile to MINT** (MINT only), and keep the resulting files in the current workspace (and on the Jobs page).

## Prerequisites

- **NeptuneGUI_2026** (this repo).
- **Neptune_2026** cloned next to it (default `../Neptune_2026`), with Poetry env and primitives server as in the Neptune_2026 README.
- Optional: set `NEPTUNE_2026_ROOT` if Neptune_2026 is not the sibling folder.

Local compile does **not** need a separate Neptune HTTP service on port 5000. `server/` calls `fluigi` through `server/compileRunner.js`. Production can still proxy to Modal when `NEPTUNE_COMPILE_URL` is set (see **docs/SERVER_DEPLOYMENT_GUIDE.md**).

## Start the GUI

From **NeptuneGUI_2026** project root:

```bash
npm ci
npm run backend:install
npm run start
```

Open **http://localhost:8081**. Use **Continue as Guest**. (`npm run start` launches the Vue app on **8081** and the data API on **8080**.)

Keep the 3DuF **primitives** server reachable for fluigi (typically `http://localhost:6070` on the host). Without it, component dimensions can stay at `-1`.

## Compile an LFR file

1. **Dashboard** → open a workspace → open or create an `.lfr` file (script language is fixed by the extension).
2. **Editor:** edit, then either:
   - **Save file** (writes the buffer), then **Save and synthesize** for full place-and-route, or
   - **Compile to MINT** for LFR → MINT only (no PR JSON / no evaluation scores).
3. On **Save and synthesize** success the workspace receives stamped generated names `{stem}(YYYYMMDDHHMM).ext` for:
   - `*_fromLFR.mint`
   - `*_fromLFR_PR.json` (placed and routed)
   - matching `.log` and `*_evaluation.json` (kept with the job / backup zip; Dashboard hides log/eval sidecars)
4. On **Compile to MINT** success the workspace receives / opens `*_fromLFR.mint` (unplaced intermediate JSON is discarded). Built-in example seeds are **not** timestamp-stamped.
5. **Jobs** lists the run (auto-refresh every 10 s). **Delete** on the job or the primary JSON removes the job and sibling generated files (JSON / MINT / log / eval). **Alerts** shows done/fail when a processing job finishes.

TREE-PLACE is invoked with `dump_intermediates=False` (hardcoded in `fluigi/place_and_route.py`): only `{stem}_PR.json` is written to the compile output directory. No `Neptune_2026/Benchmarks/` tree / result / PNG / cluster dumps; disconnected clusters stay in memory. Set that one argument to `True` to restore the full inspection set (geometry unchanged). English P&R docs: `Neptune_2026/PRalgorithm/README.md`; Chinese: `readme_cn.md`.

## Editor save, rename, move, and copy

Toolbar actions that write the buffer: **Save file**, **Save and synthesize**, **Compile to MINT**, **Rename** Confirm, **Move** / **Copy** destination write. Leaving the Editor discards unsaved text edits.

| Action | Original file | Destination / navigation |
|--------|---------------|--------------------------|
| Save file | Updated in place | Same workspace; then Dashboard expands that workspace |
| Rename (Confirm) | Renamed immediately | Same workspace; keeps last-saved body (does not auto-save unsaved edits) |
| Move to another workspace | Removed after a successful write | Existing or new workspace (+ notes); **file name unchanged**; stays in Editor |
| Copy to another workspace | Unchanged | Existing or new workspace (+ notes); **file name unchanged**; stays in Editor |
| Import | — | Pick existing or new workspace (+ notes) for the uploaded file |

New-workspace dialogs ask for workspace **name** and optional **notes**. Notes are viewable later from the Dashboard workspace card. Existing-workspace menus omit the current workspace; if none remain, the control explains that no other workspace can be selected.

### Fluigi flags used by synthesize / Compile to MINT

| Editor action | `compileMode` / type | Fluigi |
|---------------|----------------------|--------|
| Save and synthesize (`.lfr`) | `lfr` | `fluigi synthesize -o <out> <source>` |
| Save and synthesize (`.mint`) | `mint` | `fluigi synthesizeFromMINT -o <out> <source>` |
| Compile to MINT (`.lfr` only) | `lfrToMint` (alias `POST /api/v1/lfrToMint`) | `fluigi compile_lfr -o <out> <source>` — success = primary `*_fromLFR.mint` |

- `--pre-load` is added **only** when the Editor actually sent `` `import `` modules (`importLfr`). Default LFR modules already live in `pylfr/library`.
- **3DuF visualization JSON is not passed as `--component-library`.** That path is not a fluigi entity library and hangs place-and-route on PORT/VALVE3D lookups.

### Cross-workspace LFR imports

```lfr
`import "WorkspaceName/module.lfr"
```

- `WorkspaceName` is the **exact Dashboard workspace name**.
- On synthesize / Compile to MINT, the Editor sends only the referenced files as `importLfr`. Missing paths or circular imports block compile before fluigi runs.

### Example workspace

Guest **Example** seeds `flow_only_demo` and `flow_and_control_demo` (LFR, handwritten MINT, `*_fromLFR.mint`, PR JSON). Workspace notes explain the demos and that `*_fromLFR.mint` is compiler output while the plain `.mint` is handwritten. Missing seed files are recreated only if Example is empty (renames/deletes stick).

## Workspace backup

**Dashboard** → **Export workspaces** / **Import workspaces** (also sidebar **Export**, export-on-exit). ZIP layout:

```text
index.json
jobs.json
component_table.json
component_library.json
workspace_<id>_<Name>/
  metadata.json
  LFR/  MINT/  JSON/  log/  evaluation/  other/
```

Guest sessions are not kept on the server after refresh: workspaces, uploads, DIY overrides, and **compile jobs** are wiped, then a new guest identity is issued so previous outputs are not copied back into Example. Export if you need the files later.

## Summary

| Role | Port | Command / config |
|------|------|------------------|
| Data API | 8080 | started by `npm run start` |
| Frontend | 8081 | `npm run start` → http://localhost:8081 |
| Neptune_2026 / fluigi | — | sibling clone or `NEPTUNE_2026_ROOT` |
| Primitives | 6070 | Docker primitives-server (Neptune_2026 README Step 3) |

## If LFR does not save or compile

- **Save:** **PUT /api/v1/file** should return 200.
- **Save and synthesize:** **POST /api/v1/mushroommapper** (LFR) or **POST /api/v1/fluigi** (MINT).
- **Compile to MINT:** **POST /api/v1/mushroommapper** with `compileMode: "lfrToMint"` (or **POST /api/v1/lfrToMint**).
- Confirm Neptune_2026 is at `NEPTUNE_2026_ROOT` and primitives are up. Check the job log on **Jobs**.
