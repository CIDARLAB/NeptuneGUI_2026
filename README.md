# Neptune UI

Vue 2 + Vuetify web app (frontend for Neptune_2026).

## Where user and workspace data are stored

This project supports a **local Data server** that stores everything under the project root **`Data/`** folder:

| Path | Purpose |
|------|--------|
| **Data/Admin/** | Admin account. Default: username **cidar**, password **12345**. |
| **Data/Temp/** | Guest (temporary) sessions. One subfolder per guest session; data is temporary. |
| **Data/Users/&lt;username&gt;/** | Each registered user has a folder; all their workspaces and files are stored here. If a registration uses an existing username, the app shows: **“Username already taken. Please choose another.”** |

See **`Data/README.md`** for the full layout. To use this storage:

1. Install and start the server: `npm run server:install` then `npm run server` (runs on port 8080).
2. Start the frontend: `npm run dev` (port 8081). The dev server proxies `/api` to the Data server.
3. Log in as admin (**cidar** / **12345**), register a new user (username must be unique), or use **Continue as Guest** (data goes to `Data/Temp/`).

Alternatively, you can use the **Neptune_2026** backend (user data there) or the in-browser **local auth** / **guest sessionStorage** fallback (see TESTING.md).

## Local demo (with Neptune_2026 backend)

1. Start **Neptune_2026** on your machine:
   - HTTP API on **port 8080**
   - Socket.IO on **port 3000**
2. In this repo: `npm install` then `npm run dev`
3. Open **http://localhost:8081** in the browser for the demo.

The dev server proxies `/api` to `http://localhost:8080` and `/socket.io` to `http://localhost:3000`. You can also use **Guest** (no backend required for workspaces/files) or **local auth** (no backend required for register/login).

## How to test

See **[TESTING.md](./TESTING.md)**. Quick steps:

1. Install: `npm install` or `yarn install`
2. Run locally: `npm run dev` or `yarn dev` — app runs at **http://localhost:8081**
3. Unit tests: `npm run test:unit`
4. E2E tests: run `npm run serve` in one terminal, then `npm run test:e2e` in another
5. Production build: `npm run build` — output in `dist/`
