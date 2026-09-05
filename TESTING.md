# Neptune GUI – Testing guide

This project is a **Vue 2 + Vuetify** web app. It supports local development, unit tests, and E2E tests.

## Requirements

- **Node.js** 14+ (16 or 18 recommended)
- **npm** or **yarn**

Install Node.js (if needed):

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nodejs npm

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

---

## Local demo with Neptune_2026

To run the UI with the real backend for a local demo:

1. Start **Neptune_2026** so that:
   - HTTP API is on **http://localhost:8080**
   - Socket.IO is on **http://localhost:3000**
2. In this repo run:
   ```bash
   npm install
   npm run dev
   ```
3. Open **http://localhost:8081** in the browser.

The dev server is fixed to port **8081** and proxies `/api` to the backend (8080) and `/socket.io` to port 3000. If your backend uses different ports, update `vue.config.js` `devServer.proxy`.

---

## 1. Install dependencies

```bash
# From project root
npm install
# or
yarn install
```

---

## 2. Run the app (development)

Start the dev server and open the browser:

```bash
npm run dev
# or
yarn dev
```

Or start without opening the browser:

```bash
npm run serve
# or
yarn serve
```

App URL: **http://localhost:8081**

- `/` — Landing
- `/login` — Login
- `/register` — Register
- `/dashboard` — Dashboard (requires login)
- `/editor` — Editor

---

## 3. Production build

```bash
npm run build
# or
yarn build
```

Output is in `dist/`, ready for static hosting or deployment (e.g. Vercel via `now.json`).

---

## 4. Unit tests (Jest)

```bash
npm run test:unit
# or
yarn test:unit
```

Tests live in `tests/unit/` (`*.spec.js`).

---

## 5. E2E tests (Cypress)

Start the dev server in one terminal:

```bash
npm run serve
```

Then run E2E in another:

```bash
npm run test:e2e
# or
yarn test:e2e
```

Cypress will open; run the specs under `tests/e2e/specs/`.

---

## 6. Lint (ESLint)

```bash
npm run lint
# or
yarn lint
```

---

## Quick test flow (recommended)

```bash
npm ci
npm run backend:install
npm run start
# Open http://localhost:8081 → Continue as Guest
```

Guest UI smoke (align with **README.md** / **RUN_LFR.md**):

1. **Dashboard** — expand Example; open notes; open an `.lfr` via file name.
2. **Editor** — **Rename** Confirm; edit then leave without Save (unsaved text discarded); **Save file**; **Move** / **Copy** to another workspace (stays in Editor; name unchanged).
3. **Compile to MINT** on an LFR → workspace gets `*_fromLFR.mint` (no PR JSON).
4. **Save and synthesize** → Jobs row + stamped PR JSON / MINT; **Alerts** when done/fail; Jobs **Apply** weights refresh **Total**.
5. **Component Library** — open default component in 3DuF; DIY mixer `edgeBend*`.
6. **Export / Import** workspaces ZIP (includes `jobs.json` and typed folders).

Optional automated:

```bash
npm run test:unit
# E2E: run "npm run serve" first, then "npm run test:e2e"
```

---

## Notes

- Prefer **`npm run start`** (GUI **8081** + data API **8080**). Local fluigi uses sibling `Neptune_2026` / `NEPTUNE_2026_ROOT` when `NEPTUNE_COMPILE_URL` is unset (see **RUN_LFR.md**).
- **Dev proxy**: `vue.config.js` `devServer.proxy` sends `/api` to `http://localhost:8080` and `/socket.io` to `http://localhost:3000`. Change these if your stack uses other ports.
- **Tests**: Example E2E/unit tests target Neptune pages (e.g. `#login`, Neptune logo). Adjust `tests/e2e/specs/test.js` and `tests/unit/example.spec.js` if the UI changes.
