/**
 * File-based data layer using project root Data/ folder.
 * Structure: Data/Admin, Data/Temp/<sessionId>, Data/Users/<username>
 */

const fs = require('fs')
const path = require('path')

const DATA_ROOT = path.join(__dirname, '..', 'Data')
const ADMIN_DIR = path.join(DATA_ROOT, 'Admin')
const TEMP_DIR = path.join(DATA_ROOT, 'Temp')
const USERS_DIR = path.join(DATA_ROOT, 'Users')

const ADMIN_FILE = path.join(ADMIN_DIR, 'admin.json')
const DEFAULT_ADMIN = { username: 'cidar', password: '12345' }

function ensureDirs () {
  ;[DATA_ROOT, ADMIN_DIR, TEMP_DIR, USERS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
  if (!fs.existsSync(ADMIN_FILE)) {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(DEFAULT_ADMIN, null, 2))
  }
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
  const file = { id, name: fileName, ext: ext || '', content: '' }
  fileList.push(file)
  saveFiles(session, workspaceId, fileList)
  return file
}

function updateFileContent (session, workspaceId, fileId, content) {
  const list = getFiles(session, workspaceId)
  const f = list.find(x => String(x.id) === String(fileId))
  if (!f) return null
  f.content = content
  saveFiles(session, workspaceId, list)
  return f
}

function deleteFile (session, workspaceId, fileId) {
  let list = getFiles(session, workspaceId)
  list = list.filter(x => String(x.id) !== String(fileId))
  saveFiles(session, workspaceId, list)
}

module.exports = {
  ensureDirs,
  getAdmin,
  validateAdmin,
  userExists,
  getUser,
  createUser,
  validateUser,
  getTempDir,
  getTempOrUserDir,
  ensureSessionDir,
  getWorkspaceIds,
  getWorkspace,
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  getFileIds,
  getFile,
  getFiles,
  createFile,
  updateFileContent,
  deleteFile,
  DATA_ROOT,
}
