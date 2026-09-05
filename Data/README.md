# Data folder – user data storage

All user and session data is stored under the project root `Data/` directory.

## Structure

```
Data/
├── Admin/          # Administrator account data
│   └── admin.json  # Default admin: username cidar, password 12345
├── Temp/           # Guest (temporary) session data; cleared or expired as needed
│   └── <sessionId>/
│       └── ...     # Workspaces and files for this guest session
├── Users/          # Registered users: one folder per username
│   └── <username>/
│       └── ...     # user.json, workspaces, files
├── 3DuF_component/ # Bundled Component Library seeds (read by dataLayer / seed-data)
│   └── default/
│       ├── JSON/   # P&R-style device JSON (components + layers; not glyph-only dumps)
│       ├── MINT/   # Matching default MINT entities
│       └── LFR/    # Matching default LFR modules
└── example/        # Guest Example workspace seeds
    ├── flow_only_demo/
    └── flow_and_control_demo/
```

## Bundled library and examples

- **`3DuF_component/default`**: ~9 built-in types (channel, mixer, mux, port, reaction_chamber, tree, valve3D, …). Default FLOW `channelWidth` is **600**. Mixer defaults include **edgeBend1/edgeBend2**. Reaction chamber MINT/LFR use entity **`REACTION CHAMBER`**. JSON is compiler-aligned P&R device shape for Library / 3DuF open.
- **`example/`**: Guest **Example** workspace seeds `flow_only_demo` and `flow_and_control_demo` (LFR, handwritten `.mint`, compiler `*_fromLFR.mint`, PR JSON). Workspace notes explain the demos. Missing seed files are recreated only when Example is empty (user renames/deletes stick).

## Rules

- **Admin**: Single admin account. Default credentials: username `cidar`, password `12345`. Stored in `Data/Admin/`.
- **Temp**: Guest sessions. Each "Continue as Guest" session gets a unique id; its data lives under `Data/Temp/<sessionId>/`. Opening or refreshing the GUI calls `POST /api/v2/guest/clearBrowserReloadState`, which empties that session (and in-memory compile jobs) and then mints a new guest cookie. Data is not recovered unless the user exported a ZIP.
- **Users**: Each registered user has a folder `Data/Users/<username>/`. If registration is attempted with an existing username, the server returns a conflict and the client should show: **"Username already taken. Please choose another."**

Do not commit real user data or passwords to version control. Add `Data/` to `.gitignore` (except this README, `3DuF_component/`, `example/`, and other intentional seeds) if needed.
