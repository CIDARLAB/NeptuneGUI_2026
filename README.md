# Neptune UI

Vue 2 + Vuetify frontend for Neptune_2026.

## How to run locally

All commands below are run from the **project root** (the folder that contains `package.json`).

```bash
# 1. Install dependencies
npm install

# 2. Start the Data server (API, port 8080)
npm run server:install   # only needed once (or when server deps change)
npm run server           # run this each time you want to use the app (e.g. after reboot)

# 3. In a new terminal, start the frontend (port 8081)
npm run dev
```

Then open **http://localhost:8081** in your browser.

- **Admin:** username `cidar`, password `12345`
- **Guest:** click “Continue as Guest” to try without an account (data is temporary)

- **Run LFR and compile:** see **[RUN_LFR.md](./RUN_LFR.md)** (connect Editor to Neptune_2026 and store output in Data).
- More details: **TESTING.md**, **Data/README.md**.
