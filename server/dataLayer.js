/**
 * File-based data layer using project root Data/ folder.
 * Structure: Data/Admin, Data/Temp/<sessionId>, Data/Users/<username>
 *
 * Default component library files are resolved from (in order):
 *   1. Data/3DuF_component/default/  — volume / local checkout (optional overrides)
 *   2. seed-data/3DuF_component/default/ — immutable copy baked into the Docker image
 *
 * Production mounts a persistent volume at Data/. That volume often starts empty
 * (or only has Admin/Temp/Users). Without the seed-data fallback, Component Library
 * would list zero defaults even though the image bundles them.
 */

const fs = require('fs')
const path = require('path')

const DATA_ROOT = path.join(__dirname, '..', 'Data')
const ADMIN_DIR = path.join(DATA_ROOT, 'Admin')
const TEMP_DIR = path.join(DATA_ROOT, 'Temp')
const USERS_DIR = path.join(DATA_ROOT, 'Users')
const COMPONENT_ROOT = path.join(DATA_ROOT, '3DuF_component')
const COMPONENT_DEFAULT_DIR = path.join(COMPONENT_ROOT, 'default')
const COMPONENT_DEFAULT_JSON_DIR = path.join(COMPONENT_DEFAULT_DIR, 'JSON')
const COMPONENT_DEFAULT_LFR_DIR = path.join(COMPONENT_DEFAULT_DIR, 'LFR')
const COMPONENT_DEFAULT_MINT_DIR = path.join(COMPONENT_DEFAULT_DIR, 'MINT')
const COMPONENT_TMP_DIR = path.join(COMPONENT_ROOT, 'tmp')

// Baked into the image by Dockerfile (COPY Data/3DuF_component/default → seed-data/...).
// Override with NEPTUNE_SEED_DATA_ROOT if the seed tree lives elsewhere.
const SEED_ROOT = process.env.NEPTUNE_SEED_DATA_ROOT || path.join(__dirname, '..', 'seed-data')
const BUNDLED_COMPONENT_DEFAULT_DIR = path.join(SEED_ROOT, '3DuF_component', 'default')
const BUNDLED_COMPONENT_JSON_DIR = path.join(BUNDLED_COMPONENT_DEFAULT_DIR, 'JSON')
const BUNDLED_COMPONENT_LFR_DIR = path.join(BUNDLED_COMPONENT_DEFAULT_DIR, 'LFR')
const BUNDLED_COMPONENT_MINT_DIR = path.join(BUNDLED_COMPONENT_DEFAULT_DIR, 'MINT')

/** Volume path first (overrides), then image-bundled defaults. */
function componentDefaultJsonDirs () {
  return [COMPONENT_DEFAULT_JSON_DIR, BUNDLED_COMPONENT_JSON_DIR]
}

function componentDefaultLfrDirs () {
  return [COMPONENT_DEFAULT_LFR_DIR, BUNDLED_COMPONENT_LFR_DIR]
}

function componentDefaultMintDirs () {
  return [COMPONENT_DEFAULT_MINT_DIR, BUNDLED_COMPONENT_MINT_DIR]
}

const ADMIN_FILE = path.join(ADMIN_DIR, 'admin.json')
const DEFAULT_ADMIN = { username: 'cidar', password: '12345' }

function ensureDirs () {
  ;[
    DATA_ROOT,
    ADMIN_DIR,
    TEMP_DIR,
    USERS_DIR,
    COMPONENT_ROOT,
    COMPONENT_DEFAULT_DIR,
    COMPONENT_DEFAULT_JSON_DIR,
    COMPONENT_DEFAULT_LFR_DIR,
    COMPONENT_DEFAULT_MINT_DIR,
    COMPONENT_TMP_DIR,
  ].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
  if (!fs.existsSync(ADMIN_FILE)) {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(DEFAULT_ADMIN, null, 2))
  }
}

function sanitizeComponentSyntax (syntax) {
  return String(syntax || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

// Case-insensitive lookup: we don't care whether the file is `valve.json`,
// `Valve.json`, or `VALVE.json` on disk — any of them should resolve for
// the syntax `valve`. This also means renaming a file doesn't silently
// remove it from the library.
function resolveComponentFilename (dir, syntax, extRe) {
  if (!fs.existsSync(dir)) return null
  const want = sanitizeComponentSyntax(syntax)
  if (!want) return null
  const entries = fs.readdirSync(dir)
  return entries.find(name =>
    extRe.test(name) && name.replace(extRe, '').toLowerCase() === want,
  ) || null
}

function resolveComponentPathInDirs (dirs, syntax, extRe) {
  for (const dir of dirs) {
    const fname = resolveComponentFilename(dir, syntax, extRe)
    if (fname) return path.join(dir, fname)
  }
  return null
}

function getComponentDefaultPath (syntax) {
  return resolveComponentPathInDirs(componentDefaultJsonDirs(), syntax, /\.json$/i)
}

function getComponentTmpPath (syntax) {
  const safe = sanitizeComponentSyntax(syntax)
  if (!safe) return null
  return path.join(COMPONENT_TMP_DIR, `${safe}.json`)
}

function listDefaultComponentSyntaxes () {
  ensureDirs()
  const syntaxes = new Set()
  for (const dir of componentDefaultJsonDirs()) {
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      if (!/\.json$/i.test(name)) continue
      syntaxes.add(name.replace(/\.json$/i, '').toLowerCase())
    }
  }
  return [...syntaxes].sort()
}

function loadComponentJson (syntax) {
  ensureDirs()
  const defPath = getComponentDefaultPath(syntax)
  const tmpPath = getComponentTmpPath(syntax)
  if (!defPath || !fs.existsSync(defPath)) return null
  const safeSyntax = sanitizeComponentSyntax(syntax)
  const tryReadJson = (p) => {
    try {
      const raw = fs.readFileSync(p, 'utf8')
      return JSON.parse(raw)
    } catch (_) {
      return null
    }
  }
  if (tmpPath && fs.existsSync(tmpPath)) {
    const tmpJson = tryReadJson(tmpPath)
    if (tmpJson) {
      return { syntax: safeSyntax, source: 'tmp', path: tmpPath, json: tmpJson }
    }
  }
  const defJson = tryReadJson(defPath)
  if (!defJson) return null
  return { syntax: safeSyntax, source: 'default', path: defPath, json: defJson }
}

function getComponentDefaultLfrPath (syntax) {
  return resolveComponentPathInDirs(componentDefaultLfrDirs(), syntax, /\.lfr$/i)
}

function getComponentDefaultMintPath (syntax) {
  return resolveComponentPathInDirs(componentDefaultMintDirs(), syntax, /\.mint$/i)
}

function readTextIfExists (p) {
  if (!p || !fs.existsSync(p)) return ''
  return fs.readFileSync(p, 'utf8')
}

function saveComponentTmpJson (syntax, jsonObj) {
  const p = getComponentTmpPath(syntax)
  if (!p) return false
  fs.writeFileSync(p, JSON.stringify(jsonObj, null, 2))
  return true
}

function resetComponentTmpJson (syntax) {
  const p = getComponentTmpPath(syntax)
  if (!p) return false
  if (fs.existsSync(p)) fs.unlinkSync(p)
  return true
}

/** Remove all JSON overrides under Data/3DuF_component/tmp (DIY edits to built-in components). */
function clearAllComponentTmpJsonFiles () {
  ensureDirs()
  if (!fs.existsSync(COMPONENT_TMP_DIR)) return true
  try {
    for (const name of fs.readdirSync(COMPONENT_TMP_DIR)) {
      if (!/\.json$/i.test(name)) continue
      try {
        fs.unlinkSync(path.join(COMPONENT_TMP_DIR, name))
      } catch (_) {}
    }
  } catch (_) {
    return false
  }
  return true
}

function getAdmin () {
  ensureDirs()
  const raw = fs.readFileSync(ADMIN_FILE, 'utf8')
  return JSON.parse(raw)
}

function validateAdmin (username, password) {
  const admin = getAdmin()
  return admin.username === username && admin.password === password
}

function getUserDir (username) {
  const safe = (username || '').replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) return null
  return path.join(USERS_DIR, safe)
}

function getUserPath (username) {
  const dir = getUserDir(username)
  return dir ? path.join(dir, 'user.json') : null
}

function userExists (username) {
  const p = getUserPath(username)
  return p && fs.existsSync(p)
}

function getUser (username) {
  const p = getUserPath(username)
  if (!p || !fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function createUser (username, password) {
  if (userExists(username)) return { error: 'username_taken' }
  const dir = getUserDir(username)
  if (!dir) return { error: 'invalid_username' }
  fs.mkdirSync(dir, { recursive: true })
  const user = {
    _id: username,
    username,
    email: username,
    password,
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(path.join(dir, 'user.json'), JSON.stringify(user, null, 2))
  return { user: { _id: user._id, username: user.username, email: user.email } }
}

function validateUser (username, password) {
  const u = getUser(username)
  if (!u) return null
  return u.password === password ? { _id: u._id, username: u.username, email: u.email } : null
}

const RESET_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

function getResetPath (username) {
  const dir = getUserDir(username)
  return dir ? path.join(dir, 'reset.json') : null
}

function setResetCode (username, code) {
  const p = getResetPath(username)
  if (!p) return false
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) return false
  fs.writeFileSync(p, JSON.stringify({
    code: String(code),
    expiresAt: Date.now() + RESET_EXPIRY_MS,
  }, null, 2))
  return true
}

function getResetCode (username) {
  const p = getResetPath(username)
  if (!p || !fs.existsSync(p)) return null
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (Date.now() > (data.expiresAt || 0)) return null
    return data.code || null
  } catch (e) {
    return null
  }
}

function deleteResetCode (username) {
  const p = getResetPath(username)
  if (p && fs.existsSync(p)) fs.unlinkSync(p)
}

function updateUserPassword (username, newPassword) {
  const u = getUser(username)
  if (!u) return false
  const userPath = getUserPath(username)
  if (!userPath) return false
  u.password = newPassword
  fs.writeFileSync(userPath, JSON.stringify(u, null, 2))
  return true
}

function updateUserProfile (oldUsername, { username: newUsername, email }) {
  const u = getUser(oldUsername)
  if (!u) return { error: 'User not found' }
  const oldDir = getUserDir(oldUsername)
  if (!oldDir || !fs.existsSync(oldDir)) return { error: 'User not found' }
  const newName = (newUsername != null && newUsername !== '') ? String(newUsername).trim() : u.username
  const newSafe = newName.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!newSafe) return { error: 'invalid_username' }
  if (newName !== oldUsername) {
    const newDir = path.join(USERS_DIR, newSafe)
    if (fs.existsSync(newDir)) return { error: 'username_taken' }
    fs.renameSync(oldDir, newDir)
    u.username = newName
  }
  if (email !== undefined && email !== null) u.email = String(email).trim()
  const userPath = getUserPath(u.username)
  fs.writeFileSync(userPath, JSON.stringify(u, null, 2))
  return { user: { _id: u._id, username: u.username, email: u.email } }
}

function getTempDir (sessionId) {
  if (!sessionId || sessionId.length > 64) return null
  return path.join(TEMP_DIR, sessionId)
}

function getTempOrUserDir (session) {
  if (session.type === 'guest') return getTempDir(session.id)
  if (session.type === 'user' || session.type === 'admin') return getUserDir(session.id)
  return null
}

function ensureSessionDir (session) {
  const dir = getTempOrUserDir(session)
  if (!dir) return null
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getWorkspacesPath (session) {
  const dir = ensureSessionDir(session)
  return dir ? path.join(dir, 'workspaces.json') : null
}

function getWorkspaces (session) {
  const p = getWorkspacesPath(session)
  if (!p || !fs.existsSync(p)) return []
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function getWorkspaceIds (session) {
  return getWorkspaces(session).map(w => w._id)
}

function getWorkspace (session, workspaceId) {
  const list = getWorkspaces(session)
  return list.find(w => String(w._id) === String(workspaceId)) || null
}

function saveWorkspaces (session, list) {
  const p = getWorkspacesPath(session)
  if (!p) return
  fs.writeFileSync(p, JSON.stringify(list, null, 2))
}

function createWorkspace (session, name) {
  const list = getWorkspaces(session)
  const id = String(Date.now())
  const workspace = { _id: id, name: name || 'Workspace', updated_at: new Date().toISOString(), files: [] }
  list.push(workspace)
  saveWorkspaces(session, list)
  return workspace
}

function deleteWorkspace (session, workspaceId) {
  let list = getWorkspaces(session)
  list = list.filter(w => String(w._id) !== String(workspaceId))
  saveWorkspaces(session, list)
}

function deleteWorkspaceDeep (session, workspaceId) {
  deleteWorkspace(session, workspaceId)
  const p = getFilesPath(session, workspaceId)
  try {
    if (p && fs.existsSync(p)) fs.unlinkSync(p)
  } catch (e) {}
}

function getFilesPath (session, workspaceId) {
  const dir = ensureSessionDir(session)
  if (!dir) return null
  return path.join(dir, `workspace_${workspaceId}_files.json`)
}

function getFiles (session, workspaceId) {
  const p = getFilesPath(session, workspaceId)
  if (!p || !fs.existsSync(p)) return []
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function getFileIds (session, workspaceId) {
  return getFiles(session, workspaceId).map(f => f.id)
}

function getFile (session, workspaceId, fileId) {
  const list = getFiles(session, workspaceId)
  return list.find(f => String(f.id) === String(fileId)) || null
}

function saveFiles (session, workspaceId, list) {
  const p = getFilesPath(session, workspaceId)
  if (!p) return
  fs.writeFileSync(p, JSON.stringify(list, null, 2))
}

function createFile (session, workspaceId, fileName, ext) {
  const workspaces = getWorkspaces(session)
  const ws = workspaces.find(w => String(w._id) === String(workspaceId))
  if (!ws) return null
  const fileList = getFiles(session, workspaceId)
  const id = String(Date.now())
  const now = new Date().toISOString()
  const file = { id, name: fileName, ext: ext || '', content: '', created_at: now, updated_at: now }
  fileList.push(file)
  saveFiles(session, workspaceId, fileList)
  ws.updated_at = now
  saveWorkspaces(session, workspaces)
  return file
}

function updateFileContent (session, workspaceId, fileId, content, newName) {
  const list = getFiles(session, workspaceId)
  const f = list.find(x => String(x.id) === String(fileId))
  if (!f) return null
  const now = new Date().toISOString()
  f.content = content
  if (newName != null && String(newName).trim() !== '') f.name = String(newName).trim()
  f.updated_at = now
  saveFiles(session, workspaceId, list)
  const workspaces = getWorkspaces(session)
  const ws = workspaces.find(w => String(w._id) === String(workspaceId))
  if (ws) {
    ws.updated_at = now
    saveWorkspaces(session, workspaces)
  }
  return f
}

function deleteFile (session, workspaceId, fileId) {
  let list = getFiles(session, workspaceId)
  list = list.filter(x => String(x.id) !== String(fileId))
  saveFiles(session, workspaceId, list)
}

function getComponentLibraryPath (session) {
  const dir = ensureSessionDir(session)
  if (!dir) return null
  return path.join(dir, 'componentLibrary.json')
}

function getComponentLibrary (session) {
  const p = getComponentLibraryPath(session)
  if (!p || !fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    return null
  }
}

function saveComponentLibrary (session, data) {
  const p = getComponentLibraryPath(session)
  if (!p) return false
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
  return true
}

/** Guest Temp session only: empty workspaces, remove per-workspace file blobs, clear custom library imports. */
function clearGuestSessionUserData (session) {
  if (!session || session.type !== 'guest' || !session.id) return false
  ensureSessionDir(session)
  const dir = getTempDir(session.id)
  if (dir && fs.existsSync(dir)) {
    try {
      const entries = fs.readdirSync(dir)
      for (const name of entries) {
        if (name.startsWith('workspace_') && name.endsWith('_files.json')) {
          try {
            fs.unlinkSync(path.join(dir, name))
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
  try {
    saveWorkspaces(session, [])
    saveComponentLibrary(session, { customComponents: [] })
  } catch (_) {
    return false
  }
  return true
}

/**
 * Clear imported/custom component rows only (built-in defaults unchanged).
 * Used on each GUI load for admin/user cookies so uploads like "terrace" do not persist
 * when the product is treated as guest-only but legacy cookies remain.
 */
function clearSessionImportedComponents (session) {
  if (!session || !session.id) return false
  const t = session.type
  if (t !== 'guest' && t !== 'user' && t !== 'admin') return false
  try {
    ensureSessionDir(session)
    saveComponentLibrary(session, { customComponents: [] })
    return true
  } catch (_) {
    return false
  }
}

module.exports = {
  ensureDirs,
  getAdmin,
  validateAdmin,
  userExists,
  getUser,
  createUser,
  validateUser,
  setResetCode,
  getResetCode,
  deleteResetCode,
  updateUserPassword,
  updateUserProfile,
  getTempDir,
  getTempOrUserDir,
  ensureSessionDir,
  getWorkspaceIds,
  getWorkspace,
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaceDeep,
  getFileIds,
  getFile,
  getFiles,
  createFile,
  updateFileContent,
  deleteFile,
  getComponentLibrary,
  saveComponentLibrary,
  clearGuestSessionUserData,
  clearSessionImportedComponents,
  sanitizeComponentSyntax,
  listDefaultComponentSyntaxes,
  loadComponentJson,
  saveComponentTmpJson,
  resetComponentTmpJson,
  clearAllComponentTmpJsonFiles,
  getComponentDefaultPath,
  getComponentDefaultLfrPath,
  getComponentDefaultMintPath,
  readTextIfExists,
  DATA_ROOT,
  SEED_ROOT,
  BUNDLED_COMPONENT_DEFAULT_DIR,
}
