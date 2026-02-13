/**
 * In-memory + sessionStorage store for guest users.
 * Data is lost when the tab is closed (sessionStorage).
 */

const KEY = 'neptune_guest_data'

function load () {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { workspaces: [], nextWorkspaceId: 1, nextFileId: 1 }
  } catch (e) {
    return { workspaces: [], nextWorkspaceId: 1, nextFileId: 1 }
  }
}

function save (data) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Guest store: could not save', e)
  }
}

function getWorkspaceIds () {
  const data = load()
  return data.workspaces.map(w => w._id)
}

function getWorkspace (workspaceId) {
  const data = load()
  return data.workspaces.find(w => String(w._id) === String(workspaceId)) || null
}

function getWorkspaces () {
  return load().workspaces
}

function createWorkspace (name) {
  const data = load()
  const id = String(data.nextWorkspaceId++)
  const workspace = {
    _id: id,
    name: name || 'Guest Workspace',
    files: [],
    updated_at: new Date().toISOString(),
  }
  data.workspaces.push(workspace)
  save(data)
  return workspace
}

function deleteWorkspace (workspaceId) {
  const data = load()
  data.workspaces = data.workspaces.filter(w => String(w._id) !== String(workspaceId))
  save(data)
}

function getFiles (workspaceId) {
  const w = getWorkspace(workspaceId)
  return w ? w.files : []
}

function getFile (workspaceId, fileId) {
  const w = getWorkspace(workspaceId)
  if (!w || !w.files) return null
  return w.files.find(f => String(f.id) === String(fileId)) || null
}

function createFile (workspaceId, fileName, ext) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w) return null
  if (!w.files) w.files = []
  const id = String(data.nextFileId++)
  const file = {
    id,
    name: fileName,
    content: '',
    ext: ext || '',
  }
  w.files.push(file)
  save(data)
  return file
}

function updateFile (workspaceId, fileId, content) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w || !w.files) return null
  const f = w.files.find(x => String(x.id) === String(fileId))
  if (!f) return null
  f.content = content
  save(data)
  return f
}

function deleteFile (workspaceId, fileId) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w || !w.files) return
  w.files = w.files.filter(x => String(x.id) !== String(fileId))
  save(data)
}

export default {
  getWorkspaceIds,
  getWorkspace,
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  getFiles,
  getFile,
  createFile,
  updateFile,
  deleteFile,
  load,
  save,
}
