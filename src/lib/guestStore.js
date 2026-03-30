/**
 * Guest workspace storage: localStorage so data survives tab close.
 * Guest can export to a file (save to a path) and later import from that file to restore.
 */

import { EXAMPLE_LFR_SCRIPT, EXAMPLE_MINT_SCRIPT } from './exampleScripts'

const KEY = 'neptune_guest_data'

export const EXAMPLE_WORKSPACE_NAME = 'Example'

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

const UPLOAD_WORKSPACE_NAME = 'uploaded files'

/** Seeded demo file names; used to pick which duplicate "Example" row to keep when merging. */
const EXAMPLE_MINT_FILENAME = 'flow_and_control_demo.mint'
const EXAMPLE_OLD_MINT_FILENAME = 'flow_and_control_demo_fromLFR.mint'
const EXAMPLE_SEED_FILE_NAMES = new Set([
  'flow_and_control_demo.lfr',
  EXAMPLE_MINT_FILENAME,
])

/**
 * If multiple workspaces are named "Example" (e.g. after import), merge into one on load/refresh.
 * Files are merged by filename (skip if primary already has that name). Other workspace names are untouched.
 */
function dedupeNamedExampleWorkspaces () {
  const data = load()
  const examples = data.workspaces.filter(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  if (examples.length <= 1) return

  const score = (w) => {
    const names = new Set((w.files || []).map(f => f.name))
    const hasBothSeeds = [...EXAMPLE_SEED_FILE_NAMES].every(n => names.has(n))
    return { hasBothSeeds, count: (w.files || []).length, w }
  }
  let best = score(examples[0])
  let primary = examples[0]
  for (let i = 1; i < examples.length; i++) {
    const s = score(examples[i])
    if (s.hasBothSeeds && !best.hasBothSeeds) {
      best = s
      primary = s.w
    } else if (s.hasBothSeeds === best.hasBothSeeds && s.count > best.count) {
      best = s
      primary = s.w
    }
  }

  if (!primary.files) primary.files = []
  const now = new Date().toISOString()

  for (const dup of examples) {
    if (dup._id === primary._id) continue
    for (const f of dup.files || []) {
      if (primary.files.some(pf => pf.name === f.name)) continue
      const id = String(data.nextFileId++)
      primary.files.push({
        id,
        name: f.name,
        content: f.content != null ? f.content : '',
        ext: f.ext || '',
        created_at: f.created_at || now,
        updated_at: f.updated_at || now,
      })
    }
  }
  primary.updated_at = now

  const dropIds = new Set(examples.filter(x => x._id !== primary._id).map(x => x._id))
  data.workspaces = data.workspaces.filter(w => !dropIds.has(w._id))
  save(data)
}

/**
 * Example first, then "uploaded files", then others A–Z (stable default view).
 */
function getWorkspacesSortedForDashboard () {
  const list = [...getWorkspaces()]
  list.sort((a, b) => {
    const an = String(a.name || '').trim()
    const bn = String(b.name || '').trim()
    const rank = (name) => {
      if (name === EXAMPLE_WORKSPACE_NAME) return 0
      if (name === UPLOAD_WORKSPACE_NAME) return 1
      return 2
    }
    const ar = rank(an)
    const br = rank(bn)
    if (ar !== br) return ar - br
    return an.localeCompare(bn, undefined, { sensitivity: 'base' })
  })
  return list
}

/** Reuse existing "uploaded files" workspace if present; otherwise create it. */
function getOrCreateUploadWorkspace () {
  const data = load()
  const found = data.workspaces.find(
    w => String(w.name || '').trim() === UPLOAD_WORKSPACE_NAME
  )
  if (found) return found
  return createWorkspace(UPLOAD_WORKSPACE_NAME, '')
}

function migrateExampleMintFilename () {
  const data = load()
  const ex = data.workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  if (!ex || !ex.files) return
  const oldF = ex.files.find(f => f.name === EXAMPLE_OLD_MINT_FILENAME)
  const newF = ex.files.find(f => f.name === EXAMPLE_MINT_FILENAME)
  if (oldF && !newF) {
    oldF.name = EXAMPLE_MINT_FILENAME
    save(data)
  }
}

function seedExampleDemoFiles (wid) {
  const specs = [
    { name: 'flow_and_control_demo.lfr', ext: '.lfr', content: EXAMPLE_LFR_SCRIPT },
    { name: EXAMPLE_MINT_FILENAME, ext: '.mint', content: EXAMPLE_MINT_SCRIPT },
  ]
  for (const spec of specs) {
    const files = getFiles(wid)
    if (files.some(f => f.name === spec.name)) continue
    const f = createFile(wid, spec.name, spec.ext)
    if (f) updateFile(wid, f.id, spec.content)
  }
}

/**
 * Ensure Example workspace exists and contains both demo files (adds any missing by name).
 * Other files in Example are left untouched.
 */
function ensureExampleWorkspace () {
  dedupeNamedExampleWorkspaces()
  migrateExampleMintFilename()
  let ex = load().workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  if (!ex) {
    createWorkspace(EXAMPLE_WORKSPACE_NAME, '')
    ex = load().workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  }
  if (!ex) return
  seedExampleDemoFiles(ex._id)
}

/** Remove all workspaces that have no files (Dashboard stays empty until user saves/uploads). */
function pruneEmptyWorkspaces () {
  const data = load()
  const next = data.workspaces.filter(w => Array.isArray(w.files) && w.files.length > 0)
  if (next.length === data.workspaces.length) return
  data.workspaces = next
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
  getOrCreateUploadWorkspace,
  ensureExampleWorkspace,
  getWorkspacesSortedForDashboard,
  pruneEmptyWorkspaces,
}
