# Neptune GUI + Compute — Server Deployment & Integration Guide (English)

This guide is for engineers deploying and operating **NeptuneGUI_2026** (Vue frontend + Express data server) together with the **Compute backend** (Modal `modal_app.py` running Neptune_2026 / fluigi). It covers architecture, Primitives Server placement, the **Compile** request/response contract, and the **Jobs** UI behavior.

---

## 1. Architecture overview

```
Browser (Vue — :8081 dev / Fly HTTPS prod)
    │  REST /api/v1/*
    ▼
Express Data Server (NeptuneGUI, :8080)
    │  Auth, workspaces/files, component library
    │  Enrich: sourceContent + componentBundle
    │  Proxy compile + job polling
    ▼
Modal Compute API (modal_app.py)
    │  Per worker: fluigi + 3DuF primitives (container-scoped reuse)
    │  Write bundle to temp dir → fluigi synthesize / synthesizeFromMINT
    ▼
Outputs: *_PR.json, evaluation breakdown, logs; per-job temp dirs removed
    │
    ▼
Express persists result JSON into user workspace (Fly volume Data/)
    │
    ▼
Jobs UI (Solutions): status, workspace, scores, JSON actions
```

| Component | Role | Where it runs |
|-----------|------|----------------|
| **NeptuneGUI frontend** | Editor, Component Library, Jobs | Fly container `dist/` |
| **Express (`server/`)** | Sessions, files, library, compile proxy | Same Fly container, port `8080` |
| **Persistent volume `Data/`** | Workspaces, uploads, DIY component overrides | Fly mount `/app/Data` |
| **`seed-data/`** | Built-in default components (read-only in image) | Copied at image build; read via fallback in `dataLayer.js` |
| **Modal Compute** | fluigi compile, primitives, job status | `modal deploy modal_app.py` |
| **Neptune_2026** | fluigi, `evaluation_metric` | Cloned into Modal image at build time |

**Important:** The GUI container does **not** run fluigi and does **not** need a cluster-wide Primitives Server. Primitives run **inside each Modal compute worker**, lazily started and **reused for the container lifetime**.

---

## 2. Deployment steps

### 2.1 Prerequisites

- Fly.io account, `flyctl` logged in
- Modal account, `modal` CLI logged in
- GitHub token (Modal secret `neptune-github`) with access to private `CIDARLAB/Neptune_2026` (+ submodules)
- **Neptune_2026** `fluigi/component_library.py` (3DuF JSON parsing for GUI bundles) **pushed** to the branch Modal clones before image build

### 2.2 Deploy Compute (Modal)

```bash
cd NeptuneGUI_2026
# First time: create Modal secret neptune-github with GITHUB_TOKEN
modal deploy modal_app.py
```

Note the HTTPS root URL, e.g.:

`https://<workspace>--neptune-compute-api.modal.run`

### 2.3 Deploy GUI (Fly.io)

```bash
cd NeptuneGUI_2026
fly secrets set NEPTUNE_COMPILE_URL=https://<workspace>--neptune-compute-api.modal.run
fly deploy
```

`fly.toml` mounts volume `neptune_data` at `/app/Data`. Built-in components live in image `seed-data/` and are resolved via **fallback** in `dataLayer.js` so an empty volume does not yield an empty Component Library.

### 2.4 Post-deploy checks

Fly logs should include:

```text
Component library defaults: 9 type(s) [channel, mixer, ...]
Bundled seed root: /app/seed-data (present)
Neptune Data server running at http://localhost:8080
```

Open the site → **Component Library** should list ~9 built-in components.

---

## 3. Primitives Server

### 3.1 Production (Modal) — recommended

- **Do not** run a separate always-on 3DuF service on Fly or another VM.
- `modal_app.py` inside each **compute worker container**:
  1. Starts 3DuF on first compile job (`localhost:6060`);
  2. **Reuses** that process for later jobs in the same container (`primitivesReused: true`);
  3. Process ends when Modal recycles the container.
- fluigi env: `PRIMITIVE_SERVER_URI=http://localhost:6060`.

### 3.2 Resolution order (same as local CLI)

For each component entity in the design:

1. This request’s `componentBundle` → `--component-library <job-tmp>/JSON`
2. Neptune repo default `user_components/` (if present)
3. **Primitives Server** (types not covered by the bundle)

So: **even with a full componentBundle per compile, primitives must be reachable at compile time** unless every entity in the design is fully defined in the bundle.

### 3.3 Local development

| Scenario | Primitives |
|----------|------------|
| devcontainer, manual `fluigi` | Host Docker: `docker run -p 6070:6060 primitives-server` |
| GUI + `modal serve` | No manual start; handled inside Modal container |

---

## 4. Compile button — data flow

### 4.1 Frontend → Express

`POST /api/v1/mushroommapper` (`.lfr` / `.v`) or `POST /api/v1/fluigi` (`.mint` / `.uf`)

Editor fetches `/api/v1/componentFiles` first, then posts:

```json
{
  "sourcefileid": "<current LFR/MINT file id>",
  "sourcefilename": "design.lfr",
  "configfileid": "<optional config file id>",
  "configfilename": "config.json",
  "workspace": "<current workspace _id>",
  "user": "<email or guest>",
  "componentBundle": [ /* see below */ ],
  "evaluationWeights": {
    "area": 0.2,
    "compact": 0.2,
    "connectionLength": 0.2,
    "bend": 0.2,
    "symmetry": 0.1,
    "fragmentation": 0.1
  }
}
```

> **Note:** `componentBundle` and Express merge logic are **implemented**. `evaluationWeights` is the **target contract** (Jobs page weights should be sent with compile so compute can return scored breakdown; until wired, compute uses defaults and the GUI can still recompute Total from returned components).

#### Each `componentBundle` entry (slimmed by `toCompileComponentBundle` before Modal)

| Field | Meaning |
|-------|---------|
| `syntax` | Sanitized type id, e.g. `mixer` |
| `name` | Display name |
| `source` | `default` / `tmp` / `custom` |
| `sourceType` | Origin type |
| `params` | User-edited numeric params from Library DIY |
| `jsonScript` | Full 3DuF/ParchMint JSON string |
| `lfrScript` | Component LFR module (for LFR `import`) |
| `mintScript` | Component MINT snippet |

Express `proxyCompile` adds:

| Field | Source |
|-------|--------|
| `sourceContent` | Full source file from `Data/` |
| `configContent` | Optional config file content |
| `componentBundle` | Merge server list + client list (**client wins per `syntax`**) |

### 4.2 Express → Modal

`POST {NEPTUNE_COMPILE_URL}/api/v1/mushroommapper` or `/api/v1/fluigi`

Body = enriched payload above. Response = **job UUID** (JSON string).

### 4.3 Inside Modal

1. `write_component_bundle()` → temp tree:
   - `3DuF_component/default/JSON/*.json`
   - `LFR/*.lfr`, `MINT/*.mint`
2. `ensure_primitives_server()` (container reuse)
3. fluigi:
   ```bash
   fluigi synthesize -o <out> <source> \
     --component-library <tmp>/JSON \
     --pre-load <tmp>/LFR          # LFR only
   ```
4. Collect files under `output/` (including `*_fromLFR_PR.json` or `*_fromMINT_PR.json`)
5. Run `compute_layout_evaluation_scores()` on primary `*_PR.json`
6. **Remove this job’s temp directory**; keep job metadata in `job_store` until Express fetches and persists

### 4.4 Modal → Express → persistence (target behavior)

`GET /api/v1/job?id=<uuid>` when complete:

```json
{
  "status": "done",
  "returncode": 0,
  "stdout": "...",
  "stderr": "...",
  "workspaceId": "<workspace that started compile>",
  "sourceFilename": "design.lfr",
  "outputFiles": [
    {
      "fileId": "<file id after write to Data/>",
      "filename": "design_fromLFR_PR.json",
      "workspaceId": "<workspace _id>",
      "workspaceName": "My Workspace"
    }
  ],
  "evaluation": {
    "areaScore": 0.646,
    "compactScore": 0.314,
    "connectionLengthScore": 0.833,
    "bendScore": 0.407,
    "symmetryScore": 0.25,
    "fragmentationScore": 1.0,
    "overallScore": 0.52,
    "weightsUsed": {
      "area": 0.2,
      "compact": 0.2,
      "connectionLength": 0.2,
      "bend": 0.2,
      "symmetry": 0.1,
      "fragmentation": 0.1
    }
  },
  "componentCount": 9,
  "primitivesReused": true
}
```

Express should then:

1. Write `*_PR.json` (and related artifacts if needed) into the **target workspace** under `Data/`;
2. Append job metadata (workspace, file ids, `evaluation`) to the **session jobs index**;
3. Notify the frontend (poll / WebSocket);
4. Allow Modal `job_store` entry to expire after fetch (per-job backend temp storage cleared).

On failure: `status: "error"`, `stderr` contains fluigi log tail.

### 4.5 Polling APIs

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/v1/jobs` | Job ids for current session |
| `GET` | `/api/v1/job?id=<uuid>` | Job detail — query param **`id`**, not `job_id` |

---

## 5. Jobs UI (Solutions) — specified behavior

Route: Dashboard → **Results / Jobs** (`Solutions.vue`).

### 5.1 Table columns (in addition to existing score columns)

| Column | Description |
|--------|-------------|
| Input File | Source LFR/MINT name |
| Last Updated | Job completion time |
| Output File | Primary JSON (prefer `*_PR.json`) |
| **Workspace** | Workspace containing the output JSON (link to Dashboard) |
| Global Util. … Total | Six components + weighted total |
| **JSON** | Button → modal (below) |
| Action | Done / Ongoing / Fail |

### 5.2 JSON modal

**View JSON** opens:

- Top: formatted JSON (scrollable)
- Actions:
  - **Download** — download the JSON file
  - **Import to Component Library** — add as custom component
  - **Open in 3DuF** — load routed `*_PR.json` at [v2.3duf.org](https://v2.3duf.org/)
  - **Delete** — remove output from workspace and refresh jobs list

### 5.3 Evaluation scores and weight re-apply

- **Component scores** (six metrics) come from backend `evaluation` on the job record.
- **Total** formula:

  ```
  Total = w_area×GlobalUtil + w_compact×LocalCompact + w_conn×ConnLength
        + w_bend×Bend + w_sym×Symmetry + w_frag×Fragmentation
  ```

- When the user edits weights and clicks **Apply**:
  - **No new backend call**;
  - Recompute **Total** for **all rows** (examples + real jobs) using stored components and new weights.

Spec: `docs/EVALUATION_METRIC_SPEC_V1.md`. Implementation: Neptune_2026 `fluigi/evaluation_metric.py`.

---

## 6. Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEPTUNE_COMPILE_URL` | Fly secret | Modal API root, no trailing slash |
| `NEPTUNE_SEED_DATA_ROOT` | Optional | Default `/app/seed-data` |
| `NEPTUNE_2026_ROOT` | Express optional | Path for local evaluation proxy |
| `PRIMITIVE_SERVER_URI` | Set inside Modal | `http://localhost:6060` |
| `PORT` | Fly `8080` | Express listen port |

---

## 7. Troubleshooting

| Symptom | Action |
|---------|--------|
| Empty Component Library | Ensure image includes `seed-data/`; deploy `dataLayer.js` fallback |
| Compile 501 | `NEPTUNE_COMPILE_URL` not set |
| Compile 502 | Modal down or wrong URL |
| Wrong component geometry/ports | Push `component_library.py`; rebuild Modal image |
| `Could not pull default values` | Primitives not up in compute container; check `primitivesReused` in logs |
| Empty Jobs list | Verify `/api/v1/jobs`; job query must use `id=` |

---

## 8. Release checklist

- [ ] Neptune_2026 `component_library.py` pushed
- [ ] `modal deploy modal_app.py` OK
- [ ] Fly `NEPTUNE_COMPILE_URL` points to latest Modal URL
- [ ] After `fly deploy`, logs show 9 default components
- [ ] Editor Compile returns job id; new row on Jobs page
- [ ] Output JSON in correct workspace; evaluation columns populated
- [ ] Apply new weights updates all Total cells

---

## 9. Key files

| File | Role |
|------|------|
| `modal_app.py` | Compute, primitives reuse, fluigi |
| `server/index.js` | Compile proxy, evaluation proxy |
| `server/componentBundle.js` | Bundle merge / slim payload |
| `server/dataLayer.js` | Data volume + seed-data fallback |
| `src/views/dashboard/Editor.vue` | Compile button |
| `src/views/dashboard/Solutions.vue` | Jobs + evaluation weights UI |
| `fly.toml` | Fly volume and port |
| `Neptune_2026/fluigi/evaluation_metric.py` | Scoring |

---

*Version: 2026-07. If code diverges, trust the repository. Sections marked **target contract** are integration agreements—confirm implementation status with dev before release.*
