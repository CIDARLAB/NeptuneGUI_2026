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
└── Users/          # Registered users: one folder per username
    └── <username>/
        └── ...     # user.json, workspaces, files
```

## Rules

- **Admin**: Single admin account. Default credentials: username `cidar`, password `12345`. Stored in `Data/Admin/`.
- **Temp**: Guest sessions. Each "Continue as Guest" session gets a unique id; its data lives under `Data/Temp/<sessionId>/`. Data is temporary and can be removed when the session ends or periodically.
- **Users**: Each registered user has a folder `Data/Users/<username>/`. If registration is attempted with an existing username, the server returns a conflict and the client should show: **"Username already taken. Please choose another."**

Do not commit real user data or passwords to version control. Add `Data/` to `.gitignore` (except this README and structure) if needed.
