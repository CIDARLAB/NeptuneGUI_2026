# Run LFR in NeptuneGUI and store output in Data

Edit LFR in the Editor, click **Compile**, and keep the resulting MINT / JSON / log / evaluation files in the current workspace (and on the Jobs page).

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

1. **Dashboard** → open a workspace → open or create an `.lfr` file.
2. **Editor:** set **Script language** to **LFR**, edit, **Save**, then **Compile**.
3. On success the workspace receives:
   - `*_fromLFR.mint`
   - `*_fromLFR.json` (unplaced)
   - `*_fromLFR_PR.json` (placed and routed)
   - matching `.log` and `*_evaluation.json`
4. Web Compile stamps those generated names as `{stem}(YYYYMMDDHHMM).ext`. Built-in example seeds are **not** stamped.
5. **Jobs** lists the run (auto-refresh every 10 s). **Delete** on the job or the primary JSON removes the job and sibling generated files (JSON / MINT / log / eval).

TREE-PLACE is invoked with `dump_intermediates=False` (hardcoded in `fluigi/place_and_route.py`): only `{stem}_PR.json` is written to the compile output directory. No `Neptune_2026/Benchmarks/` tree / result / PNG / cluster dumps; disconnected clusters stay in memory. Set that one argument to `True` to restore the full inspection set (geometry unchanged). English P&R docs: `Neptune_2026/PRalgorithm/README.md`; Chinese: `readme_cn.md`.

## Editor save and move

From **Save file**:

| Action | Original file | Destination |
|--------|---------------|-------------|
| Save file | Updated in place | Same workspace; Dashboard then expands that workspace |
| Save file to a new workspace | Unchanged | New workspace; dialog asks workspace name, notes, and **file name** (default: current name) |
| Save file to an existing workspace | Unchanged | Chosen workspace (current workspace is omitted). If none remain, the menu shows “No existing workspace can be selected” and Save is disabled |
| Move file to a new / existing workspace | Removed after a successful copy | Same dialogs as Save |

After save or move, the GUI opens **Dashboard** with the destination workspace expanded. Clicking an LFR/MINT file name in that list opens the Editor (same as the pen button).

### Fluigi flags used by Compile

- LFR → `fluigi synthesize -o <out> <source>`
- MINT → `fluigi synthesizeFromMINT -o <out> <source>`
- `--pre-load` is added **only** when the Editor actually sent `` `import `` modules (`importLfr`). Default LFR modules already live in `pylfr/library`.
- **3DuF visualization JSON is not passed as `--component-library`.** That path is not a fluigi entity library and hangs place-and-route on PORT/VALVE3D lookups.

### Cross-workspace LFR imports

```lfr
`import "WorkspaceName/module.lfr"
```

- `WorkspaceName` is the **exact Dashboard workspace name**.
- On **Compile**, the Editor sends only the referenced files as `importLfr`. Missing paths or circular imports block compile before fluigi runs.

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
- **Compile:** **POST /api/v1/mushroommapper** (LFR) or **POST /api/v1/fluigi** (MINT). Confirm Neptune_2026 is at `NEPTUNE_2026_ROOT` and primitives are up. Check the job log on **Jobs**.
