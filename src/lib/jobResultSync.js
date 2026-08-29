import { isWorkspaceVisibleFileName } from './compileOutputFiles'

export function generatedFileNamesFromJob (job) {
  const names = new Set()
  if (!job || typeof job !== 'object') return []
  if (job.outputFileName) names.add(job.outputFileName)
  if (job.logFileName) names.add(job.logFileName)
  ;(job.generatedFiles || []).forEach((f) => {
    if (f && f.name) names.add(f.name)
  })
  return [...names]
}

export function jobOwnsFileName (job, fileName) {
  if (!job || !fileName) return false
  return generatedFileNamesFromJob(job).includes(fileName)
}

export function resolveGuestWorkspaceForJob (guestStore, job) {
  if (!guestStore || !job) return null
  const byId = (job.workspaceId || job.workspace_id)
    ? guestStore.getWorkspace(job.workspaceId || job.workspace_id)
    : null
  if (byId) return byId
  const name = String(job.workspaceName || '').trim().toLowerCase()
  if (name) {
    const byName = (guestStore.getWorkspaces() || []).find((w) =>
      String(w.name || '').trim().toLowerCase() === name
    )
    if (byName) return byName
  }
  const source = String(job.sourceFilename || '').trim()
  if (!source) return null
  return (guestStore.getWorkspaces() || []).find((w) =>
    (w.files || []).some((f) => f && f.name === source)
  ) || null
}

export function pruneHiddenCompileArtifactsFromWorkspace (guestStore, workspaceId) {
  if (!guestStore || !workspaceId) return []
  const removed = []
  ;(guestStore.getFiles(workspaceId) || []).forEach((f) => {
    if (!f || !f.name || isWorkspaceVisibleFileName(f.name)) return
    guestStore.deleteFile(workspaceId, f.id)
    removed.push(f.name)
  })
  return removed
}

export function persistGuestJobOutputs (guestStore, jobs) {
  if (!guestStore || !Array.isArray(jobs)) return []
  const touched = []
  jobs.forEach((job) => {
    const ws = resolveGuestWorkspaceForJob(guestStore, job)
    if (!ws) return
    const extras = []
    if (Array.isArray(job.generatedFiles) && job.generatedFiles.length) {
      extras.push(...job.generatedFiles)
    }
    const status = String(job.status || '').toLowerCase()
    const done = status === 'done' || status === 'success' || status === 'complete'
    if (done && job.jsonText && job.outputFileName) {
      extras.push({ name: job.outputFileName, content: job.jsonText })
    }
    extras.forEach((f) => {
      if (!f || !f.name) return
      if (!isWorkspaceVisibleFileName(f.name)) return
      guestStore.upsertFileByName(ws._id, f.name, f.content == null ? '' : f.content)
    })
    pruneHiddenCompileArtifactsFromWorkspace(guestStore, ws._id)
    if (extras.length) touched.push({ workspaceId: ws._id, jobId: job.id })
  })
  return touched
}

export async function pollCompileJobUntilSettled (axios, jobId, { timeoutMs = 120000, intervalMs = 1500 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await axios.get('/api/v1/job', {
        params: { id: jobId },
        withCredentials: true,
      })
      const job = res && res.data
      const status = String((job && job.status) || '').toLowerCase()
      if (status && status !== 'running' && status !== 'pending' && status !== 'unknown') {
        return job
      }
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return null
}

export async function fetchFullJobs (axios) {
  try {
    const res = await axios.get('/api/v1/jobs', {
      params: { full: 1 },
      withCredentials: true,
    })
    if (Array.isArray(res.data) && res.data.length && typeof res.data[0] === 'object') {
      return res.data.filter((j) => j && j.id)
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

export async function deleteJobResult (axios, guestStore, job, { isGuest } = {}) {
  const jobId = job && (job.id || job.jobId)
  if (!jobId) return { ok: false, error: 'missing_job' }
  let payload = { ok: true, fileNames: generatedFileNamesFromJob(job), workspaceId: job.workspaceId || null }
  try {
    const res = await axios.delete('/api/v1/job', {
      params: { id: jobId },
      withCredentials: true,
    })
    if (res.data && typeof res.data === 'object') {
      payload = { ...payload, ...res.data, ok: true }
    }
  } catch (err) {
    const status = err && err.response && err.response.status
    if (status !== 404) {
      return {
        ok: false,
        error: (err.response && err.response.data && err.response.data.error) || err.message || 'delete_failed',
      }
    }
  }
  const names = payload.fileNames && payload.fileNames.length
    ? payload.fileNames
    : generatedFileNamesFromJob(job)
  const wsId = payload.workspaceId || job.workspaceId || null
  // Workspace/job artifacts only — Component Library imports are left in place.
  let guestWsId = wsId
  if (isGuest && guestStore) {
    const ws = (wsId && guestStore.getWorkspace(wsId)) || resolveGuestWorkspaceForJob(guestStore, job)
    if (ws) {
      guestStore.deleteFilesByNames(ws._id, names)
      guestWsId = ws._id
    }
  }
  return { ok: true, workspaceId: guestWsId, fileNames: names, jobId }
}

export async function deleteLinkedJobForWorkspaceFile (axios, guestStore, { workspaceId, fileName, isGuest }) {
  if (!fileName) return { ok: false, linked: false }
  const jobs = await fetchFullJobs(axios)
  const job = jobs.find((j) => {
    if (!jobOwnsFileName(j, fileName)) return false
    if (!workspaceId) return true
    const jw = String(j.workspaceId || j.workspace_id || '')
    if (jw && String(workspaceId) === jw) return true
    const guestWs = resolveGuestWorkspaceForJob(guestStore, j)
    return !!(guestWs && String(guestWs._id) === String(workspaceId))
  })
  if (!job) return { ok: true, linked: false }
  const result = await deleteJobResult(axios, guestStore, job, { isGuest })
  return { ...result, linked: true, jobId: job.id }
}
