/**
 * Guest workspace storage: localStorage so data survives tab close.
 * Guest can export to a file (save to a path) and later import from that file to restore.
 */

const KEY = 'neptune_guest_data'

function load () {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { workspaces: [], nextWorkspaceId: 1, nextFileId: 1 }
  } catch (e) {
    return { workspaces: [], nextWorkspaceId: 1, nextFileId: 1 }
  }
}

function save (data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Guest store: could not save', e)
  }
}

/** Export full snapshot for saving to a file (user can choose path via Save As). */
function exportData () {
  return load()
}

/** Import from a previously exported JSON; replaces current guest data. */
function importData (data) {
  if (!data || !Array.isArray(data.workspaces)) return false
  let nextW = 1
  let nextF = 1
  data.workspaces.forEach(w => {
    const wid = Number(w._id)
    if (!isNaN(wid)) nextW = Math.max(nextW, wid + 1)
    ;(w.files || []).forEach(f => {
      const fid = Number(f.id)
      if (!isNaN(fid)) nextF = Math.max(nextF, fid + 1)
    })
  })
  const normalized = {
    workspaces: data.workspaces,
    nextWorkspaceId: data.nextWorkspaceId != null ? data.nextWorkspaceId : nextW,
    nextFileId: data.nextFileId != null ? data.nextFileId : nextF,
  }
  save(normalized)
  return true
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

function createWorkspace (name, notes) {
  const data = load()
  const id = String(data.nextWorkspaceId++)
  const workspace = {
    _id: id,
    name: name || 'Guest Workspace',
    notes: notes || '',
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
  const now = new Date().toISOString()
  const file = {
    id,
    name: fileName,
    content: '',
    ext: ext || '',
    created_at: now,
    updated_at: now,
  }
  w.files.push(file)
  w.updated_at = now
  save(data)
  return file
}

function updateFile (workspaceId, fileId, content, newName) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w || !w.files) return null
  const f = w.files.find(x => String(x.id) === String(fileId))
  if (!f) return null
  const now = new Date().toISOString()
  f.content = content
  if (newName != null && String(newName).trim() !== '') f.name = String(newName).trim()
  f.updated_at = now
  w.updated_at = now
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
  exportData,
  importData,
}
