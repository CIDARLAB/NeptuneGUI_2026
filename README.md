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
- Optional: if you run the **3DuF** repo’s dev server locally, it often uses `http://localhost:8082` (not started by NeptuneGUI).

If you see `EADDRINUSE: address already in use` when starting the server, it means one of these ports is already taken by another process. Stop the process using that port and restart (or run the services on different ports, if you adjusted the code/config).

## 3DuF visualization (one-click)

NeptuneGUI opens **[https://3duf.org/](https://3duf.org/)** in a new tab and sends the design JSON with `postMessage` (`loadDeviceFromJSON`). The base URL lives in **[src/lib/open3DuFPostMessage.js](./src/lib/open3DuFPostMessage.js)** (`THREE_DUF_APP_URL`). Neptune sends that payload **three times** (0ms / 450ms / 900ms) so a stock 3DuF build does not need any Neptune-specific code.

### Use one-click JSON → 3DuF
1. Open NeptuneGUI: `http://localhost:8081` (or your deployed GUI URL)
2. Go to **Dashboard** and select a workspace (or use **Component Library** for a component row)
3. Click the **3DuF** control on a JSON file or library row
4. Allow popups if the browser blocks the new tab

### Optional: point NeptuneGUI at a local 3DuF dev server

For development, temporarily set `THREE_DUF_APP_URL` in `src/lib/open3DuFPostMessage.js` to your local origin (for example `http://localhost:8082`), rebuild or refresh the GUI, then run 3DuF from a local clone (see [CIDARLAB/3DuF](https://github.com/CIDARLAB/3DuF), branch `webpack-build-2`).

- **Accounts:** Neptune GUI is **online guest–only** in this product. There is **no** in-app user registration; you use the app as a session guest. **We do not keep your work on the server for you.** Export (ZIP / downloads) anything you care about—**refreshing or reopening the page clears all non-default data** (your workspaces, uploads, imported library components, and DIY overrides to built-in components). Data loss from not exporting is **not** recoverable here.

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
