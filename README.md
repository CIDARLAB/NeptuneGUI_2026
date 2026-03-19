# Neptune UI

Vue 2 + Vuetify frontend for Neptune_2026.

## How to run locally

All commands below are run from the **project root** (the folder that contains `package.json`).

```bash
# 1. Install dependencies
npm install

# 2. Start backend + frontend in one command
#    (Ctrl+C to stop both processes)
npm run server:install   # only needed once (or when server deps change)
npm run start
```

Then open **http://localhost:8081** in your browser.

## Ports and conflicts
- Backend/API (`npm run server`): `http://localhost:8080`
- Frontend/GUI (`npm run serve`): `http://localhost:8081`

If you see `EADDRINUSE: address already in use` when starting the server, it means one of these ports is already taken by another process. Stop the process using that port and restart (or run the services on different ports, if you adjusted the code/config).

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
