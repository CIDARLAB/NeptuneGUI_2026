/**
 * Guest workspace storage: localStorage so data survives tab close.
 * Guest can export to a file (save to a path) and later import from that file to restore.
 */

import { EXAMPLE_SEED_SPECS } from './exampleSeedSpecs'

const KEY = 'neptune_guest_data'

export const EXAMPLE_WORKSPACE_NAME = 'Example'

/** Zip / download: never write "[object Object]" when file.content is a parsed JSON object. */
export function fileContentForZipExport (content) {
  if (content == null || content === '') return ''
  if (typeof content === 'string') return content
  try {
    return JSON.stringify(content)
  } catch (_) {
    return ''
  }
}

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
const EXAMPLE_OLD_MINT_FILENAME = 'flow_and_control_demo_fromLFR.mint'
const EXAMPLE_SEED_FILE_NAMES = new Set(EXAMPLE_SEED_SPECS.map(s => s.name))

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
    let seedHitCount = 0
    EXAMPLE_SEED_FILE_NAMES.forEach((n) => {
      if (names.has(n)) seedHitCount += 1
    })
    return { seedHitCount, count: (w.files || []).length, w }
  }
  let best = score(examples[0])
  let primary = examples[0]
  for (let i = 1; i < examples.length; i++) {
    const s = score(examples[i])
    if (s.seedHitCount > best.seedHitCount) {
      best = s
      primary = s.w
    } else if (s.seedHitCount === best.seedHitCount && s.count > best.count) {
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
  const newF = ex.files.find(f => f.name === 'flow_and_control_demo.mint')
  if (oldF && !newF) {
    oldF.name = 'flow_and_control_demo.mint'
    save(data)
  }
}

function migrateDxJsonSeedFilenames () {
  const data = load()
  const renamePairs = [
    { oldName: 'dx2_after_PR.json', newName: 'dx2_PR.json' },
    { oldName: 'dx3_after_PR.json', newName: 'dx3_PR.json' },
  ]
  let changed = false

  for (const w of data.workspaces) {
    if (!Array.isArray(w.files) || w.files.length === 0) continue
    for (const pair of renamePairs) {
      const oldIdx = w.files.findIndex(f => String(f && f.name) === pair.oldName)
      if (oldIdx < 0) continue
      const newIdx = w.files.findIndex(f => String(f && f.name) === pair.newName)

      if (newIdx < 0) {
        w.files[oldIdx].name = pair.newName
        if (!w.files[oldIdx].ext) w.files[oldIdx].ext = '.json'
        changed = true
        continue
      }

      const oldFile = w.files[oldIdx]
      const newFile = w.files[newIdx]
      const newContent = newFile && newFile.content
      const isNewEmpty =
        newContent == null || (typeof newContent === 'string' && newContent.trim() === '')
      const hasOldContent =
        oldFile && oldFile.content != null && (typeof oldFile.content !== 'string' || oldFile.content.trim() !== '')
      if (isNewEmpty && hasOldContent) {
        newFile.content = oldFile.content
      }
      w.files.splice(oldIdx, 1)
      changed = true
    }
  }

  if (changed) save(data)
}

function syncExampleDemoFiles (wid) {
  if (!Array.isArray(EXAMPLE_SEED_SPECS) || EXAMPLE_SEED_SPECS.length === 0) return
  const data = load()
  const ws = data.workspaces.find(w => String(w._id) === String(wid))
  if (!ws) return
  if (!Array.isArray(ws.files)) ws.files = []

  const now = new Date().toISOString()
  const desiredByName = new Map(EXAMPLE_SEED_SPECS.map(s => [s.name, s]))
  const nextFiles = []
  const seen = new Set()
  let changed = false

  for (const f of ws.files) {
    if (!f || !f.name) {
      changed = true
      continue
    }
    const spec = desiredByName.get(f.name)
    if (!spec) {
      // Keep Example workspace in one-to-one sync with Data/example filenames.
      changed = true
      continue
    }
    if (seen.has(f.name)) {
      changed = true
      continue
    }
    seen.add(f.name)
    if (!f.ext && spec.ext) {
      f.ext = spec.ext
      changed = true
    }
    nextFiles.push(f)
  }

  for (const spec of EXAMPLE_SEED_SPECS) {
    if (seen.has(spec.name)) continue
    const id = String(data.nextFileId++)
    nextFiles.push({
      id,
      name: spec.name,
      content: spec.content,
      ext: spec.ext || '',
      created_at: now,
      updated_at: now,
    })
    changed = true
  }

  if (changed) {
    ws.files = nextFiles
    ws.updated_at = now
    save(data)
  }
}

const CORRUPT_OBJECT_STRING = '[object Object]'

/** Known JSON seeds were once saved as literal "[object Object]"; rewrite using bundled file text. */
function repairCorruptedKnownJsonSeeds () {
  const data = load()
  const byName = new Map(
    EXAMPLE_SEED_SPECS
      .filter(s => String(s.ext || '').toLowerCase() === '.json')
      .map(s => [s.name, s])
  )
  for (const w of data.workspaces) {
    if (!w.files) continue
    for (const f of w.files) {
      const spec = byName.get(f.name)
      if (!spec || String(spec.ext || '').toLowerCase() !== '.json') continue
      const c = f.content
      const isCorruptString =
        typeof c === 'string' && c.trim() === CORRUPT_OBJECT_STRING
      if (isCorruptString) updateFile(w._id, f.id, spec.content)
    }
  }
}

/**
 * Ensure Example workspace exists and contains all Data/example text files (adds missing by name).
 * Other files in Example are left untouched.
 */
function ensureExampleWorkspace () {
  dedupeNamedExampleWorkspaces()
  migrateExampleMintFilename()
  migrateDxJsonSeedFilenames()
  let ex = load().workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  if (!ex) {
    createWorkspace(EXAMPLE_WORKSPACE_NAME, '')
    ex = load().workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  }
  if (!ex) return
  syncExampleDemoFiles(ex._id)
  repairCorruptedKnownJsonSeeds()
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
