/**
 * Workspace backup zip layout:
 *   index.json
 *   jobs.json
 *   component_table.json
 *   component_library.json
 *   workspace_<id>_<name>/
 *     metadata.json
 *     LFR/  MINT/  JSON/  log/  evaluation/  other/
 */

export function zipSafeFileName (name) {
  const base = String(name == null ? 'file' : name).split(/[/\\]/).pop() || 'file'
  return base.replace(/\0/g, '')
}

export function workspaceFolderName (workspace, idx) {
  const id = workspace && workspace._id != null ? String(workspace._id) : String(idx + 1)
  const raw = (workspace && workspace.name) || `workspace_${id}`
  const safe = String(raw).replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_')
  return `workspace_${id}_${safe || 'Workspace'}`
}

export function backupFolderForFile (fileName) {
  const n = String(fileName || '')
  const lower = n.toLowerCase()
  if (/evaluation/i.test(n) && lower.endsWith('.json')) return 'evaluation'
  if (lower.endsWith('.lfr')) return 'LFR'
  if (lower.endsWith('.mint')) return 'MINT'
  if (lower.endsWith('.json')) return 'JSON'
  if (lower.endsWith('.log')) return 'log'
  return 'other'
}

export function fileNameFromZipRel (rel) {
  const parts = String(rel || '').split('/').filter(Boolean)
  return zipSafeFileName(parts[parts.length - 1] || rel || 'file')
}

export function extFromFileName (name) {
  const n = String(name || '')
  const dot = n.lastIndexOf('.')
  if (dot <= 0) return ''
  return n.substring(dot)
}

export function fileContentForZip (content) {
  if (content == null || content === '') return ''
  if (typeof content === 'string') return content
  try {
    return JSON.stringify(content)
  } catch (_) {
    return ''
  }
}

export function addWorkspaceFilesToZip (folder, files, writeContent) {
  ;(files || []).forEach((f, fi) => {
    const name = zipSafeFileName(f && f.name ? f.name : `file_${fi + 1}`)
    if (!name || name === 'metadata.json') return
    const kind = backupFolderForFile(name)
    const content = writeContent ? writeContent(f) : fileContentForZip(f && f.content)
    folder.file(`${kind}/${name}`, content == null ? '' : content)
  })
}

export function jobsForBackup (jobs) {
  return (jobs || [])
    .filter((j) => j && (j.id || j.status))
    .map((j) => ({
      id: j.id,
      status: j.status,
      returncode: j.returncode,
      sourceFilename: j.sourceFilename || '',
      workspaceId: j.workspaceId || null,
      workspaceName: j.workspaceName || '',
      compileType: j.compileType || '',
      created_at: j.created_at,
      updated_at: j.updated_at,
      files: Array.isArray(j.files) ? j.files : [],
      evaluation: j.evaluation || null,
      log: j.log || '',
      jsonText: j.jsonText || '',
      outputFileName: j.outputFileName || '',
      logFileName: j.logFileName || '',
      generatedFiles: Array.isArray(j.generatedFiles) ? j.generatedFiles : [],
      error: j.error || '',
      fluigiCmd: Array.isArray(j.fluigiCmd) ? j.fluigiCmd : [],
      backend: j.backend || '',
    }))
}

export function mergeJobFilesIntoWorkspaces (workspaces, jobs) {
  const list = (workspaces || []).map((w) => ({
    ...w,
    files: Array.isArray(w.files) ? w.files.slice() : [],
  }))
  const byId = new Map(list.map((w) => [String(w._id), w]))
  const byName = new Map(list.map((w) => [String(w.name || '').trim().toLowerCase(), w]))

  ;(jobs || []).forEach((job) => {
    const w = byId.get(String(job.workspaceId || '')) ||
      byName.get(String(job.workspaceName || '').trim().toLowerCase())
    if (!w) return
    const names = new Set((w.files || []).map((f) => f && f.name).filter(Boolean))
    const extras = []
    if (Array.isArray(job.generatedFiles)) extras.push(...job.generatedFiles)
    if (job.outputFileName && job.jsonText) {
      extras.push({ name: job.outputFileName, content: job.jsonText })
    }
    if (job.logFileName && job.log) {
      extras.push({ name: job.logFileName, content: job.log })
    }
    extras.forEach((f) => {
      if (!f || !f.name || names.has(f.name)) return
      names.add(f.name)
      w.files.push({
        name: f.name,
        content: f.content == null ? '' : f.content,
        ext: extFromFileName(f.name),
      })
    })
  })
  return list
}

export function fillBackupZip (zip, {
  workspaces,
  jobs,
  componentTable,
  componentLibrary,
  indexExtra,
  fileContent,
} = {}) {
  const merged = mergeJobFilesIntoWorkspaces(workspaces || [], jobs || [])
  zip.file('index.json', JSON.stringify({
    exportedAt: new Date().toISOString(),
    workspaceCount: merged.length,
    ...(indexExtra || {}),
  }, null, 2))
  zip.file('jobs.json', JSON.stringify(jobsForBackup(jobs), null, 2))
  if (componentTable) {
    zip.file('component_table.json', JSON.stringify(componentTable, null, 2))
  }
  if (componentLibrary) {
    zip.file('component_library.json', JSON.stringify(componentLibrary, null, 2))
  }
  merged.forEach((w, idx) => {
    const folder = zip.folder(workspaceFolderName(w, idx))
    if (!folder) return
    folder.file('metadata.json', JSON.stringify({
      _id: w._id,
      name: w.name,
      notes: w.notes || '',
      updated_at: w.updated_at || null,
      created_at: w.created_at || null,
    }, null, 2))
    addWorkspaceFilesToZip(folder, w.files, fileContent)
  })
  return zip
}

export function listWorkspaceFolderNames (zip) {
  const folders = new Set()
  Object.keys((zip && zip.files) || {}).forEach((name) => {
    const m = String(name).match(/^(workspace_[^/]+)\/?/)
    if (m) folders.add(`${m[1]}/`)
  })
  return [...folders]
}

export async function readWorkspacesFromZip (zip) {
  const workspaces = []
  let nextWorkspaceId = 1
  let nextFileId = 1

  if (zip.files['index.json']) {
    try {
      const index = JSON.parse(await zip.files['index.json'].async('string'))
      if (index.nextWorkspaceId) nextWorkspaceId = index.nextWorkspaceId
      if (index.nextFileId) nextFileId = index.nextFileId
    } catch (_) {}
  }

  for (const folderName of listWorkspaceFolderNames(zip)) {
    const metaFile = zip.file(`${folderName}metadata.json`)
    if (!metaFile) continue
    let meta
    try {
      meta = JSON.parse(await metaFile.async('string'))
    } catch (_) {
      continue
    }

    const files = []
    const rels = Object.keys(zip.files).filter((name) => (
      name.startsWith(folderName) &&
      !name.endsWith('/') &&
      name !== `${folderName}metadata.json`
    ))

    for (const name of rels) {
      const short = name.substring(folderName.length)
      const fileName = fileNameFromZipRel(short)
      if (!fileName || fileName === 'metadata.json') continue
      const entry = zip.files[name]
      let content = ''
      try {
        content = await entry.async('string')
      } catch (_) {
        content = ''
      }
      files.push({
        id: String(nextFileId++),
        name: fileName,
        ext: extFromFileName(fileName),
        content,
      })
    }

    workspaces.push({
      _id: meta._id != null ? String(meta._id) : String(nextWorkspaceId++),
      name: meta.name || 'Guest Workspace',
      notes: meta.notes || '',
      files,
      updated_at: meta.updated_at || new Date().toISOString(),
      created_at: meta.created_at || undefined,
    })
  }

  return { workspaces, nextWorkspaceId, nextFileId }
}

export async function readJsonFromZip (zip, name, fallback = null) {
  if (!zip.files[name]) return fallback
  try {
    return JSON.parse(await zip.files[name].async('string'))
  } catch (_) {
    return fallback
  }
}

export async function fetchJobsForBackup (axios) {
  try {
    const res = await axios.get('/api/v1/jobs', {
      params: { full: 1 },
      withCredentials: true,
    })
    if (Array.isArray(res.data) && res.data.length && typeof res.data[0] === 'object' && res.data[0].id) {
      return res.data
    }
    const ids = Array.isArray(res.data) ? res.data : []
    const jobs = await Promise.all(ids.map((id) =>
      axios.get('/api/v1/job', { params: { id }, withCredentials: true })
        .then((r) => r.data)
        .catch(() => null)
    ))
    return jobs.filter((j) => j && j.id)
  } catch (_) {
    return []
  }
}

export async function fetchComponentTable (axios) {
  try {
    const res = await axios.get('/api/v1/componentFiles', {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    })
    return res.data || { components: [] }
  } catch (_) {
    return { components: [] }
  }
}

export function downloadZipBlob (blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

export function applyGeneratedFilesToGuestStore (guestStore, jobs) {
  if (!guestStore || !Array.isArray(jobs)) return
  const workspaces = guestStore.getWorkspaces() || []
  jobs.forEach((job) => {
    const byId = job.workspaceId && guestStore.getWorkspace(job.workspaceId)
    const byName = workspaces.find((w) =>
      String(w.name || '').trim().toLowerCase() === String(job.workspaceName || '').trim().toLowerCase()
    )
    const ws = byId || byName
    if (!ws) return
    const extras = []
    if (Array.isArray(job.generatedFiles)) extras.push(...job.generatedFiles)
    if (job.outputFileName && job.jsonText) extras.push({ name: job.outputFileName, content: job.jsonText })
    if (job.logFileName && job.log) extras.push({ name: job.logFileName, content: job.log })
    extras.forEach((f) => {
      if (!f || !f.name) return
      guestStore.upsertFileByName(ws._id, f.name, f.content == null ? '' : f.content)
    })
  })
}
