/**
 * Guest workspace storage in localStorage (survives SPA navigation within one tab).
 *
 * Neptune GUI is online guest–only: there are no registered accounts. Each full browser
 * load of the app resets local guest state to defaults (Example seeds only). Users must
 * export if they want to keep data; refresh or reopening the tab discards non-default work.
 *
 * Server-side guest cookie data, in-memory compile jobs, and Data/3DuF_component/tmp
 * overrides are cleared via POST /api/v2/guest/clearBrowserReloadState on each GUI load.
 */

import { EXAMPLE_SEED_SPECS } from './exampleSeedSpecs'

const KEY = 'neptune_guest_data'

/** True when this page load was triggered by an explicit reload (F5), not first visit. */
export function isBrowserReloadNavigation () {
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]
    if (nav && nav.type === 'reload') return true
  } catch (_) {}
  try {
    const perfNav = performance.navigation
    if (perfNav && perfNav.type === perfNav.TYPE_RELOAD) return true
  } catch (_) {}
  return false
}

/**
 * Each full load of the Neptune GUI document: wipe local guest workspaces/files, then
 * rebuild only the bundled Example workspace (non-default content is not kept).
 */
export function resetGuestLocalStoreToDefaultsOnly () {
  save({ workspaces: [], nextWorkspaceId: 1, nextFileId: 1 })
  ensureExampleWorkspace()
}

/**
 * Reuse an existing cookie session if the server still knows it; otherwise mint a guest.
 * Used during the visit (Editor / Library / compile), not on first document load.
 */
export async function ensureServerGuestSession (axiosInstance) {
  const ax = axiosInstance
  if (!ax || typeof ax.get !== 'function' || typeof ax.post !== 'function') return false
  const creds = { withCredentials: true }
  try {
    await ax.get('/api/v2/user', creds)
    return true
  } catch (err) {
    const status = err && err.response && err.response.status
    if (status && status !== 401 && status !== 403) return false
  }
  try {
    await ax.post('/api/v2/guest', {}, creds)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Align server with guest-only policy on each full GUI document load:
 * 1. Clear the previous cookie's Temp files, DIY tmp JSON, and in-memory jobs
 *    (must happen before replacing the cookie, or previous compile outputs come back).
 * 2. Always mint a new guest identity so leftover user/admin cookies cannot revive work.
 */
export async function syncServerEphemeralStateAfterGuiPageLoad (axiosInstance) {
  const ax = axiosInstance
  if (!ax || typeof ax.post !== 'function') return
  const creds = { withCredentials: true }
  try {
    await ax.post('/api/v2/guest/clearBrowserReloadState', {}, creds)
  } catch (_) {}
  try {
    await ax.post('/api/v2/guest', {}, creds)
  } catch (_) {}
}

export const EXAMPLE_WORKSPACE_NAME = 'Example'

export const EXAMPLE_WORKSPACE_NOTES = [
  'This workspace has two LFR examples:',
  '• flow_only_demo.lfr — flow layer only (mixer + ports).',
  '• flow_and_control_demo.lfr — flow plus control valves.',
  '',
  'MINT files come in two kinds:',
  '• *_fromLFR.mint — compiler output from the matching LFR (primitives-server / library defaults).',
  '• Handwritten .mint (no _fromLFR suffix) — the same netlist, with some 3DuF geometry edited by hand.',
  '',
  'After you change a handwritten MINT and compile it, the PR JSON (and the 3DuF drawing) will differ from the LFR-generated result.',
  '',
  'In flow_and_control_demo.mint, PORT radius and CHANNEL width differ from the LFR / primitives-server defaults. Mixer channelWidth matches the FLOW pipes (400), and edgeBend1/edgeBend2 are 200 (half that width) so the mixer ends have no lip. VALVE3D keeps library defaults (gap 600):',
  '• PORT portRadius: LFR default 1000 → 700 (smaller I/O circles in 3DuF)',
  '• CHANNEL channelWidth: LFR default 600 (FLOW and CONTROL, same as VALVE3D gap) → 400 (thinner pipes)',
  '• MIXER channelWidth 400 with edgeBend1/edgeBend2 200 (half the attached FLOW channelWidth)',
  '',
  'The compiled flow_and_control_demo_fromLFR.mint uses portRadius=1000, FLOW channelWidth=800, CONTROL channelWidth=600, valveRadius=1200.',
].join('\n')

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

function updateWorkspaceNotes (workspaceId, notes) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w) return null
  w.notes = notes == null ? '' : String(notes)
  w.updated_at = new Date().toISOString()
  save(data)
  return w
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

function findWorkspaceContainingFile (fileId) {
  if (fileId == null || fileId === '') return null
  return (getWorkspaces() || []).find((w) =>
    (w.files || []).some((f) => f && String(f.id) === String(fileId))
  ) || null
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

function updateFile (workspaceId, fileId, content, newName, options = {}) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w || !w.files) return null
  const f = w.files.find(x => String(x.id) === String(fileId))
  if (!f) return null
  const now = new Date().toISOString()
  const oldName = f.name
  const touch = options.touch !== false
  const touchWorkspace = options.touchWorkspace !== false
  f.content = content
  if (newName != null && String(newName).trim() !== '') f.name = String(newName).trim()
  if (touch) f.updated_at = now
  if (touchWorkspace) w.updated_at = now
  // After an in-place rename, drop any leftover rows that still use the old name.
  if (oldName && f.name !== oldName) {
    w.files = w.files.filter((x) => !(
      x && x.name === oldName && String(x.id) !== String(fileId)
    ))
  }
  save(data)
  return f
}

/** Rename a file in place (same id). Optionally keep content unchanged. */
function renameFile (workspaceId, fileId, newName, content) {
  const existing = getFile(workspaceId, fileId)
  if (!existing) return null
  const body = content != null ? content : existing.content
  return updateFile(workspaceId, fileId, body, newName)
}

function deleteFile (workspaceId, fileId) {
  const data = load()
  const w = data.workspaces.find(ws => String(ws._id) === String(workspaceId))
  if (!w || !w.files) return
  w.files = w.files.filter(x => String(x.id) !== String(fileId))
  save(data)
}

function upsertFileByName (workspaceId, fileName, content, options = {}) {
  const existing = (getFiles(workspaceId) || []).find(f => f && f.name === fileName)
  if (existing) {
    return updateFile(workspaceId, existing.id, content, null, options)
  }
  const ext = (String(fileName).match(/\.[^.]+$/) || [''])[0]
  const created = createFile(workspaceId, fileName, ext)
  if (!created) return null
  // createFile already stamped created/updated; refresh content without double-bumping if touch=false
  return updateFile(workspaceId, created.id, content, null, options)
}

function findFileByName (workspaceId, fileName) {
  return (getFiles(workspaceId) || []).find(f => f && f.name === fileName) || null
}

function deleteFilesByNames (workspaceId, names) {
  const wanted = new Set((names || []).filter(Boolean).map((n) => String(n)))
  if (!wanted.size) return []
  const removed = []
  ;(getFiles(workspaceId) || []).forEach((f) => {
    if (f && wanted.has(f.name)) {
      deleteFile(workspaceId, f.id)
      removed.push(f.name)
    }
  })
  return removed
}

const UPLOAD_WORKSPACE_NAME = 'uploaded files'

/** Seeded demo file names; used to pick which duplicate "Example" row to keep when merging. */
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

function migrateDxJsonSeedFilenames () {
  const data = load()
  const renamePairs = [
    { oldName: 'dx2_after_PR.json', newName: 'dx2_PRfromLFR.json' },
    { oldName: 'dx2_PR.json', newName: 'dx2_PRfromLFR.json' },
    { oldName: 'dx3_after_PR.json', newName: 'dx3_PRfromLFR.json' },
    { oldName: 'dx3_PR.json', newName: 'dx3_PRfromLFR.json' },
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
  const existingByName = new Map()
  const extras = []
  let changed = false

  for (const f of ws.files) {
    if (!f || !f.name) continue
    if (desiredByName.has(f.name) && !existingByName.has(f.name)) {
      existingByName.set(f.name, f)
      continue
    }
    extras.push(f)
  }

  // Only seed a brand-new empty Example workspace. If the user renamed or
  // deleted a seed file, do not recreate the old name on the next load.
  const createMissingSeeds = ws.files.length === 0

  const nextFiles = []
  for (const spec of EXAMPLE_SEED_SPECS) {
    const existing = existingByName.get(spec.name)
    if (existing) {
      if (!existing.ext && spec.ext) {
        existing.ext = spec.ext
        changed = true
      }
      if (existing.content !== spec.content) {
        existing.content = spec.content
        existing.updated_at = now
        changed = true
      }
      nextFiles.push(existing)
      continue
    }
    if (!createMissingSeeds) continue
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
  nextFiles.push(...extras)

  if (changed || nextFiles.length !== ws.files.length) {
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
  migrateDxJsonSeedFilenames()
  let ex = load().workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  if (!ex) {
    createWorkspace(EXAMPLE_WORKSPACE_NAME, EXAMPLE_WORKSPACE_NOTES)
    ex = load().workspaces.find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
  }
  if (!ex) return
  if (!String(ex.notes || '').trim()) {
    updateWorkspaceNotes(ex._id, EXAMPLE_WORKSPACE_NOTES)
  }
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

/**
 * Snapshot of all guest .lfr files for compile-time
 * `` `import "WorkspaceName/file.lfr" `` resolution.
 */
function collectWorkspaceLfrBundle () {
  const out = []
  ;(getWorkspaces() || []).forEach((w) => {
    const workspaceName = String((w && w.name) || 'Workspace').trim() || 'Workspace'
    ;(w.files || []).forEach((f) => {
      const fileName = String((f && f.name) || '')
      if (!/\.lfr$/i.test(fileName)) return
      const content = fileContentForZipExport(f && f.content)
      if (!String(content).trim()) return
      out.push({ workspaceName, fileName, content })
    })
  })
  return out
}

export default {
  getWorkspaceIds,
  getWorkspace,
  getWorkspaces,
  createWorkspace,
  updateWorkspaceNotes,
  deleteWorkspace,
  getFiles,
  getFile,
  findWorkspaceContainingFile,
  createFile,
  updateFile,
  renameFile,
  upsertFileByName,
  findFileByName,
  deleteFilesByNames,
  deleteFile,
  load,
  save,
  exportData,
  importData,
  getOrCreateUploadWorkspace,
  ensureExampleWorkspace,
  getWorkspacesSortedForDashboard,
  pruneEmptyWorkspaces,
  collectWorkspaceLfrBundle,
}
