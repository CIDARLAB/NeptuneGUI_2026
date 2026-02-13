# Neptune GUI – Deployment (for later)

This doc is for when you are ready to deploy the app. For the **local demo**, see [TESTING.md](./TESTING.md) (Local demo with Neptune_2026).

---

## Architecture

- **Frontend (this repo)**: Vue SPA. It calls `/api/v1`, `/api/v2`, and uses Socket.IO (port 3000) for real-time updates.
- **Backend (Neptune_2026)**: Must expose:
  - HTTP API: `/api/v1` (files, workspaces, jobs, fluigi, mushroommapper), `/api/v2` (login, register, user)
  - Socket.IO: default port 3000 (e.g. job monitoring)

---

## Local demo (no deployment)

1. Run **Neptune_2026** with API on port **8080** and Socket.IO on **3000**.
2. In this repo: `npm run dev`.
3. Open **http://localhost:8081**. The dev server proxies `/api` and `/socket.io` to the backend.

---

## Deploying later

**Option A – Frontend and backend on the same server**

- Run Neptune_2026 on that machine (e.g. API on 8080, Socket on 3000).
- Use Nginx: serve the built frontend from `dist/`, and proxy `/api` to the API port and `/socket.io` to the Socket port.
- No env vars needed; the frontend uses relative URLs.

**Option B – Frontend on static hosting (Vercel/Netlify), backend elsewhere**

- Expose the backend (e.g. with ngrok or Cloudflare Tunnel).
- Copy `.env.production.example` to `.env.production` and set:
  - `VUE_APP_API_BASEURL` — backend API URL
  - `VUE_APP_SOCKET_URL` — Socket.IO URL
- Run `npm run build` and deploy `dist/`.
- Backend must allow CORS and credentials for the frontend origin.

---

Env vars (only for Option B): see `.env.production.example`.
