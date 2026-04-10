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
- **This open-source NeptuneGUI_2026** focuses on the **Editor**, workspace files, and compile integration with Neptune_2026 (see **[RUN_LFR.md](./RUN_LFR.md)**). It **does not require** in-app cloud API key fields to be present. For LLM-assisted authoring, use the **Editor** sidebar **“LLM prompts”**: download the **prompt `.zip`**, use the files with your provider’s chat or API, then paste LFR back into the Editor.

### In this GUI today

| Step | What to do |
|------|------------|
| Prompts | **Editor** → sidebar **LLM prompts** → choose model → **Download** zip (`src/Prompt` templates). |
| Guide | In-app page **`/prompt/steps`** (route `PromptSteps`) renders **[src/Prompt/Steps.md](./src/Prompt/Steps.md)**. |
| Write LFR | Paste into **Editor**, set **Script language** to **LFR**, **Save** / **Compile** per **[RUN_LFR.md](./RUN_LFR.md)**. |
| Export | Use **Download** / copy in the Editor as implemented in your build. |

### Fees & privacy

Usage and billing are shown in the **cloud console**. Content handling follows **that vendor’s** privacy policy. If your product stores keys in Neptune, users should be able to **remove saved keys** when no longer needed.

---

## How to run locally

All commands below are run from the **project root** (the folder that contains `package.json`).

```bash
# 1. Install dependencies
npm ci

# 2. Start backend + frontend in one command
#    (Ctrl+C to stop both processes)
npm run server:install   # only needed once (or when server deps change)
npm run start
```

Then open **http://localhost:8081** in your browser.

Dependency install note:
- Use `npm ci` for a clean, reproducible install.
- You do **not** need to run `npm ci` every time you start the app.
- Run `npm ci` on first setup, or after `package-lock.json`/dependencies change.

How to stop running commands:
- In the terminal where `npm run ...` is running, press `Ctrl + C` to stop it.
- If both backend and frontend are running together (for example via `npm run start`), `Ctrl + C` stops the combined process.
- If a process does not stop on the first try, press `Ctrl + C` again.

## Ports and conflicts
- Backend/API (`npm run server`): `http://localhost:8080`
- Frontend/GUI (`npm run serve`): `http://localhost:8081`
- Local 3DuF dev server: `http://localhost:8082`

If you see `EADDRINUSE: address already in use` when starting the server, it means one of these ports is already taken by another process. Stop the process using that port and restart (or run the services on different ports, if you adjusted the code/config).

## Local 3DuF integration (offline/local workflow)

NeptuneGUI can work with a **local 3DuF** instance, so users do not need to rely on the public website.

### 1) Start NeptuneGUI locally
From this repo:

```bash
npm run start
```

This starts:
- Backend at `http://localhost:8080`
- GUI at `http://localhost:8081`

### 2) Start 3DuF locally (sibling folder)
Assume `3DuF` is next to this repo, for example:
- `/home/<you>/Downloads/NeptuneGUI_2026`
- `/home/<you>/Downloads/3DuF`

If you do not already have 3DuF locally, clone the recommended branch:

```bash
cd ..
git clone -b webpack-build-2 https://github.com/CIDARLAB/3DuF.git
```

Recommended upstream branch: `webpack-build-2`  
Repository: https://github.com/CIDARLAB/3DuF/tree/webpack-build-2

Then run:

```bash
cd ../3DuF
npm ci
npm run vue-serve
```

3DuF should run at `http://localhost:8082`.

Log warning note:
- During `npm run vue-serve`, you may see many warnings (Sass/tooling deprecations, webpack notices, etc.).
- These warnings are expected in the current Vue CLI/Webpack toolchain and usually do not mean the local integration failed.
- If the terminal shows that the app is running on `http://localhost:8082`, you can continue using NeptuneGUI + 3DuF locally.

### 3) Use one-click JSON -> 3DuF in NeptuneGUI
1. Open NeptuneGUI: `http://localhost:8081`
2. Go to **Dashboard** and select a workspace
3. For a `.json` file, click the **3DuF** button on the file card
4. NeptuneGUI opens local 3DuF (`localhost:8082`) and sends JSON via `postMessage`

This flow is local-to-local and does not require `3duf.org`.

- **Admin:** username `cidar`, password `12345`
- **Guest:** click “Continue as Guest” to try without an account (data is temporary)

- **Run LFR and compile:** see **[RUN_LFR.md](./RUN_LFR.md)** (connect Editor to Neptune_2026 and store output in Data).
- More details: **TESTING.md**, **Data/README.md**.

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
