# Run LFR in NeptuneGUI and store output in Data

This guide lets you edit and run LFR code in the NeptuneGUI Editor and have compile output available (including storing results under the NeptuneGUI **Data** folder as a temporary result store).

## Prerequisites

- **Neptune_2026** backend (the one that provides `/api/v1/mushroommapper` and compile/job APIs).
- **NeptuneGUI_2026** (this repo) with the Data server and frontend.

## Step 1: Start Neptune_2026 (compile service)

From the **Neptune_2026** project directory:

1. Start the Neptune_2026 backend on a port, e.g. **5000** (use its own docs).
2. Ensure it exposes at least:
   - `POST /api/v1/mushroommapper` (for LFR/.v compile)
   - `POST /api/v1/fluigi` (for .uf/.mint if needed)
   - `GET /api/v1/jobs`, `GET /api/v1/job` (for job status)
   - Socket.IO on port **3000** if you want live console output in the Editor.

3. **(Optional)** Configure Neptune_2026 to write compile/output files into NeptuneGUI’s Data folder, e.g.:
   - Set an output directory to: `NeptuneGUI_2026/Data/output` or `NeptuneGUI_2026/Data/Temp/<session>/output`
   - Then compile results will appear under **Data** as a temporary result database.

## Step 2: Start NeptuneGUI Data server (auth + files + proxy)

From **NeptuneGUI_2026** project root:

```bash
npm run server:install   # once
NEPTUNE_COMPILE_URL=http://localhost:5000 npm run server
```

- Replace `5000` with the port where Neptune_2026 is running.
- The Data server will:
  - Serve auth and file/workspace APIs (Data/Admin, Data/Temp, Data/Users).
  - **Proxy** compile requests to Neptune_2026, so the Editor’s “Save and Compile” uses Neptune.

## Step 3: Start NeptuneGUI frontend

In a **new terminal**, from NeptuneGUI_2026 project root:

```bash
npm run dev
```

Open **http://localhost:8081**. Log in (e.g. admin **cidar** / **12345**) or use **Continue as Guest**.

## Step 4: Use the Editor to run LFR

1. Go to **Dashboard** → create or open a **Workspace** → create or open an **LFR file** (e.g. `main.lfr`).
2. In **Editor**:
   - Edit the LFR code.
   - Click **Save** to store the file (saved in Data or Neptune_2026 depending on your setup).
   - Click **Save and Compile** → choose config if needed → **Compile**.
3. Compile request goes: **Browser** → **Data server (8080)** → **Neptune_2026 (5000)**. Console output appears in the Neptune Console panel if Socket.IO is connected.
4. If Neptune_2026 is configured to write output into **NeptuneGUI_2026/Data/** (e.g. `Data/output` or `Data/Temp/...`), those files are your temporary result database.

## Summary

| Role              | Port  | Command / config |
|-------------------|-------|-------------------|
| Neptune_2026      | 5000  | Start per Neptune_2026 docs; optional: output dir = `Data/output` |
| Data server       | 8080  | `NEPTUNE_COMPILE_URL=http://localhost:5000 npm run server` |
| Frontend          | 8081  | `npm run dev` → open http://localhost:8081 |

- **Save** in Editor: persists the current file (via Data server into Data/Users or Data/Temp).
- **Compile** in Editor: goes through the Data server to Neptune_2026; output can be stored under **Data** if Neptune_2026 is set to write there.

## If LFR does not save or compile

- **Save:** Ensure you are not in Guest mode without server (or use “Continue as Guest” so the Data server stores files in Data/Temp). Check browser Network tab: **PUT /api/v1/file** should succeed (200).
- **Compile:** Ensure Neptune_2026 is running and **NEPTUNE_COMPILE_URL** is set when starting the Data server. Check Network: **POST /api/v1/mushroommapper** should hit the Data server and then Neptune_2026 (no 501/502).
