# Neptune UI

Vue 2 + Vuetify frontend for Neptune_2026.

## English → LFR (BYOK) — user journey

This section summarizes the **bring-your-own-key** path from **English description** to **LFR**, and what **this repo implements today** versus optional **product-specific** features.

### Cloud provider (always your account)

1. **Register** on the platform you will use (e.g. DashScope / Model Studio, OpenAI, Anthropic, Google—your choice).
2. **Enable** the chat/code models you need and **billing** or **trial credits** (per that console).
3. **Create an API key**, store it privately; do not paste it into public channels.

### Inside Neptune (depends on deployment)

- **If your deployment includes** “API / model settings” (names vary): choose provider → paste key → save; use **test connection** if offered.
- **If your deployment includes** a dedicated **English → LFR** screen: describe the design in English, pick a model if available, run **Generate LFR**, then review compile results and iterate.
- **This open-source NeptuneGUI_2026** focuses on the **Editor**, workspace files, and compile integration with Neptune_2026 (see **[RUN_LFR.md](./RUN_LFR.md)**). It **does not require** in-app cloud API key fields to be present. For LLM-assisted authoring, use the **Editor** sidebar **“LLM prompts”**: **export** the prompt package (`.zip` for Claude/GPT/Gemini, **`.md` for Qwen/DeepSeek** — those chats do not accept zip), use it with your provider’s chat or API, then paste LFR back into the Editor.

### In this GUI today

| Step | What to do |
|------|------------|
| 1. Export | **Editor** → sidebar **LLM prompts** → choose model → **Export prompt package**. Claude/GPT/Gemini → **`.zip`**; **Qwen/DeepSeek → `.md`** (not zip). |
| 2. Setup (once) | Paste **`en2lfr_system`** (or the English→LFR section of the `.md` pack) into that LLM’s system / custom instructions (see **`START_HERE.md`**). Do **not** edit template files. |
| 3. Chat | Open your provider chat (**Open … chat** button) and describe your device in **plain English** in the message. |
| 4. Paste LFR | Copy the ` ```lfr ` block into **Editor**, set **Script language** to **LFR**, **Save** / **Compile** per **[RUN_LFR.md](./RUN_LFR.md)**. |
| Guide | In-app **`/prompt/steps`** renders **[src/Prompt/USER_GUIDE.md](./src/Prompt/USER_GUIDE.md)**. Short English version of `ignore/prompt中文版.md`: **[docs/WRITE_LFR_WITH_PROMPT_PACKAGE.md](./docs/WRITE_LFR_WITH_PROMPT_PACKAGE.md)**. |
| Workspace backup | **Dashboard** → **Export workspaces** / **Import workspaces** (.zip). Same ZIP from sidebar **Export** or export-on-exit (guest). Layout: `index.json`, `jobs.json`, `component_table.json` / `component_library.json`, then `workspace_<id>_<Name>/{metadata.json, LFR/, MINT/, JSON/, log/, evaluation/}`. |

### Neptune screens (sidebar)

These routes are what the **guest UI** exposes today:

- **Dashboard** — Workspaces and files. Click an LFR/MINT **file name** (or the pen icon) to open it in the Editor. Workspace cards show a **notes** control (read-only) when notes were set at create time. JSON rows: **3DuF** is always left of **Save to component library**. **Export workspaces** / **Import workspaces** (.zip, includes jobs and the component-library cache).
- **Editor** — Monaco editor toolbar: **Save file**; **Save and synthesize** (full place-and-route → MINT + PR JSON + log/eval); LFR-only **Compile to MINT** (`*_fromLFR.mint`, no PR JSON); **Rename** (Confirm/Cancel; applies immediately, keeps last-saved body); **Move to another workspace** / **Copy to another workspace** (optional new workspace + notes; destination **file name stays the same**; stays in Editor after transfer); per-file **Import** (pick existing or new workspace + notes) / **Export** / **Delete**. Script language is fixed by the file extension (selector disabled). Unsaved buffer edits are discarded when you leave the Editor unless you used Save / Save and synthesize / Rename Confirm / Compile to MINT / Move-Copy. After **Save file**, Dashboard opens with that workspace expanded. LFR cross-file `` `import "WorkspaceName/file.lfr" ``; integrated **terminal**; **LLM prompts** sidebar **only** on this route. After a full reload, opening Editor still binds the Example workspace (so “Current workspace” is not None).
- **Jobs** — Compile runs: download outputs, open a job as a workspace, inspect files, **Delete** (job + generated JSON/MINT/log/eval siblings). Table auto-refreshes every **10 s**. **Apply** on evaluation weights recomputes **Total** for all rows without a new backend call. Compile outputs are written into the originating workspace (sidecars such as logs/eval stay on the job / backup zip). Reloading or reopening the site **clears jobs** with the rest of the guest session (they are not restored into Example).
- **Alerts** — Compile done/fail notifications; unread count on the bell; open the matching Jobs row.
- **Component Library** — Component table (syntax is **case-sensitive** in-app); **Import JSON component**; **DIY** overrides (mixer includes `edgeBend` / `edgeBend1` / `edgeBend2`); **Go to 3DuF** per row (requires device JSON with `components` / `layers`).

Legacy Material Dashboard demo routes (charts, maps, etc.) still exist under `src/router.js` but are **not** linked from the main drawer.

### Fees & privacy

Usage and billing are shown in the **cloud console**. Content handling follows **that vendor’s** privacy policy. If your product stores keys in Neptune, users should be able to **remove saved keys** when no longer needed.

---

## How to run locally

All commands below are run from the **project root** (the folder that contains `package.json`).

```bash
# 1. Install dependencies (first clone only)
npm ci
npm run backend:install   # server/ has its own package.json; root npm ci does not cover it

# 2. Start the GUI + its local data API
#    (Ctrl+C to stop both)
npm run start
```

Then open **http://localhost:8081** in your browser.

After the first setup, day-to-day use is just **`npm run start`**. Re-run `npm ci` / `backend:install` only when root or `server/` dependencies change (or after deleting `node_modules`).

NeptuneGUI is a **browser frontend** (Vue on port **8081**), but the page cannot by itself read/write workspace files on disk or talk to Neptune_2026 for compile. A small **local data API** in `server/` (port **8080**) does that: guest/session, `Data/` workspaces, library JSON, and optional compile forwarding. **`npm run start`** launches both; you normally never start them separately.

Optional — two terminals (only if you need to debug one side):

```bash
npm run backend    # local data API → http://localhost:8080
npm run frontend   # Vue GUI → http://localhost:8081
```

Dependency install note:
- Use `npm ci` for a clean, reproducible install.
- You do **not** need to run `npm ci` every time you start the app.
- Run `npm ci` on first setup, or after `package-lock.json`/dependencies change.

How to stop:
- In the terminal where `npm run start` is running, press `Ctrl + C` (both processes stop).
- If a process does not stop on the first try, press `Ctrl + C` again.

## Ports and conflicts

With `npm run start`, these ports are used:

| Role | Port | URL |
|------|------|-----|
| Local data API (`server/`) | **8080** | `http://localhost:8080` |
| Vue GUI (what you open) | **8081** | `http://localhost:8081` |
| Optional local 3DuF (separate repo) | **8082** | `http://localhost:8082` — see below |

If you see `EADDRINUSE: address already in use`, one of these ports is already taken. Stop that process and restart (or change ports in config).

## 3DuF visualization (one-click)

By default, NeptuneGUI opens the live site **[https://3duf.org/](https://3duf.org/)** in a new tab and sends the design JSON with `postMessage` (`loadDeviceFromJSON`). The base URL lives in **[src/lib/open3DuFPostMessage.js](./src/lib/open3DuFPostMessage.js)** (`THREE_DUF_APP_URL`).

If 3DuF’s features do not meet your needs, fork **[CIDARLAB/3DuF](https://github.com/CIDARLAB/3DuF)** into your own GitHub account, customize it there, and point NeptuneGUI at your build (hosted or local) by changing `THREE_DUF_APP_URL`.

### Use one-click JSON → 3DuF
1. Open NeptuneGUI: `http://localhost:8081` (or your deployed GUI URL)
2. Go to **Dashboard** and select a workspace (or use **Component Library** for a component row)
3. Click the **3DuF** control on a JSON file or library row
4. Allow popups if the browser blocks the new tab

### Optional: local 3DuF development

Prerequisites for the 3DuF app itself: **Node.js 16+** and **npm**.

```bash
git clone https://github.com/CIDARLAB/3DuF.git
cd 3DuF
npm run start3duf            # installs missing deps if needed, then starts the Vue dev server
```

Open the URL printed by Vue CLI (typically **`http://localhost:8082`**).

Then point NeptuneGUI at that local origin: set `THREE_DUF_APP_URL` in `src/lib/open3DuFPostMessage.js` to `http://localhost:8082`, and refresh (or rebuild) the GUI. More detail: [3DuF README](https://github.com/CIDARLAB/3DuF).

- **Accounts:** Neptune GUI is **online guest–only**. There is **no** in-app user registration; protected routes use a **local guest session** (see `src/main.js`). **We do not keep your work on the server for you.** Use **Export workspaces** (ZIP includes workspace files, `jobs.json`, and `component_table.json` / `component_library.json`), the sidebar **Export** button, or export-on-exit when offered. **Refreshing or reopening the site clears non-default data** (workspaces, uploads, imported library components, DIY overrides, **in-memory compile jobs**). A new guest cookie is minted after that wipe so previous run files are not written back into Example. Data loss from not exporting is **not** recoverable here.
- **Server vs. GUI:** The bundled **`server/`** still implements **register/login** HTTP APIs for older deployments; **this GUI build does not use that flow.**

- **Run LFR and compile:** see **[RUN_LFR.md](./RUN_LFR.md)** (connect Editor to Neptune_2026 and store output in Data).
- **Compile modes:** **Save and synthesize** → `fluigi synthesize` (LFR) or `synthesizeFromMINT` (MINT) for full P&R. LFR **Compile to MINT** → `fluigi compile_lfr` with body `compileMode: "lfrToMint"` (alias `POST /api/v1/lfrToMint`); job succeeds on primary `*_fromLFR.mint` (no PR JSON / no evaluation). `--pre-load` is added **only** for Editor `` `import `` modules. **3DuF visualization JSON is not passed as `--component-library`** (that lookup hangs P&R on PORT/VALVE3D).
- **Compile artifacts:** web synthesize stamps generated JSON / MINT / log / evaluation filenames as `{stem}(YYYYMMDDHHMM).ext` (example seeds in the Editor are not stamped). TREE-PLACE uses **`dump_intermediates=False`** (in `fluigi/place_and_route.py`): it writes only the final `*_PR.json` to the compile output directory and does **not** dump `tree.json` / `result.json` / PNGs or cluster scratch under `Neptune_2026/Benchmarks/`. Set that one argument to `True` to restore the full inspection set; dumps do not change layout geometry.
- **Bundled library seeds:** `Data/3DuF_component/default/{JSON,MINT,LFR}` ship P&R-style device JSON (not glyph-only `renderLayers` dumps) aligned with default MINT/LFR. Default FLOW `channelWidth` is **600**; mixer defaults include **edgeBend1/edgeBend2**; reaction chamber uses MINT/LFR entity **`REACTION CHAMBER`**.
- More details: **TESTING.md**, **Data/README.md**, **docs/SERVER_DEPLOYMENT_GUIDE.md**.

## About deprecation warnings

When you run `npm run dev` or `npm run build`, you may see **Sass / tooling deprecation warnings**, for example:

- `DEPRECATION WARNING [legacy-js-api]: The legacy JS API is deprecated…`
- `DEPRECATION WARNING [import]: Sass @import rules are deprecated…`
- `DEPRECATION WARNING [global-builtin]: Global built-in functions are deprecated…`

These mostly come from the **Vue CLI 4 + Vuetify 2 toolchain and their internal Sass code**, not from your application logic. In this project:

- We have **updated our own Sass** to avoid the `global-builtin` issue (e.g. `rgba()` now uses the modern `sass:color` API).
- Remaining `import` / `legacy-js-api` warnings are from **third‑party build tooling** and will only fully disappear after a future stack upgrade (e.g. Vue 3 + Vuetify 3).

So:

- **They do not mean the app is broken** or insecure by themselves.
- You can safely ignore them during normal development and testing.
