/**
 * Copy / move a Dashboard workspace file (LFR, MINT, JSON) to another workspace.
 * Matches Editor transfer: same file name, optional new workspace + notes,
 * destination Last Edited is force-touched, original is removed only on move.
 */

import guestStore, { fileContentForZipExport } from './guestStore'

const API = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }

export function canCopyMoveWorkspaceFile (file) {
  const ext = String((file && file.ext) || '').toLowerCase().replace(/^\./, '')
  const name = String((file && (file.name || file.file_name || file.filename)) || '').toLowerCase()
  if (ext === 'lfr' || ext === 'mint' || ext === 'json') return true
  return name.endsWith('.lfr') || name.endsWith('.mint') || name.endsWith('.json')
}

export function fileExtOf (file) {
  const ext = String((file && file.ext) || '').trim()
  if (ext) return ext.startsWith('.') ? ext : `.${ext}`
  const name = String((file && (file.name || file.file_name)) || '')
  const m = name.match(/\.[0-9a-z]+$/i)
  return (m && m[0]) || ''
}

export async function loadWorkspacesForPicker (axios, isGuest, exceptWorkspaceId) {
  let list
  if (isGuest) {
    list = guestStore.getWorkspacesSortedForDashboard() || []
  } else {
    const idsRes = await axios.get('/api/v1/workspaces', API)
    const ids = idsRes.data || []
    const loaded = await Promise.all(ids.map((wid) =>
      axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...API })
        .then((w) => w.data)
        .catch(() => null)
    ))
    list = loaded.filter(Boolean)
  }
  return (list || []).filter((w) => (
    w && (exceptWorkspaceId == null || exceptWorkspaceId === '' || String(w._id) !== String(exceptWorkspaceId))
  ))
}

async function loadFiles (axios, isGuest, workspaceId) {
  if (isGuest) return guestStore.getFiles(workspaceId) || []
  const filesRes = await axios.get('/api/v1/files', { params: { id: workspaceId }, ...API })
  const ids = filesRes.data || []
  const metas = await Promise.all(ids.map((fid) =>
    axios.get('/api/v1/file', { params: { id: fid }, ...API }).then((r) => r.data).catch(() => null)
  ))
  return metas.filter(Boolean)
}

async function readFileText (axios, isGuest, workspaceId, file) {
  if (file && file.content != null && file.content !== '') {
    return fileContentForZipExport(file.content)
  }
  if (isGuest && workspaceId && file && file.id) {
    const local = guestStore.getFile(workspaceId, file.id)
    return local ? fileContentForZipExport(local.content) : ''
  }
  if (file && file.id) {
    const res = await axios.get('/api/v1/fs', {
      params: { id: file.id },
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text',
    })
    return res.data != null ? String(res.data) : ''
  }
  return ''
}

export async function createWorkspaceForTransfer (axios, isGuest, name, notes) {
  if (isGuest) return guestStore.createWorkspace(name, notes)
  const res = await axios.post('/api/v1/workspace', { name, notes }, API)
  return res.data
}

export async function copyOrMoveWorkspaceFile ({
  axios,
  isGuest,
  sourceWorkspaceId,
  file,
  destWorkspace,
  isMove,
}) {
  const wsId = destWorkspace && (destWorkspace._id || destWorkspace.id)
  if (!wsId) throw new Error('No destination workspace')
  const fileName = String((file && (file.name || file.file_name)) || '').trim()
  if (!fileName) throw new Error('File has no name')
  const ext = fileExtOf(file)
  const destFiles = await loadFiles(axios, isGuest, wsId)
  if ((destFiles || []).some((f) => f && f.name === fileName)) {
    throw new Error('A file named "' + fileName + '" already exists in that workspace.')
  }
  const text = await readFileText(axios, isGuest, sourceWorkspaceId, file)

  if (isGuest) {
    const created = guestStore.createFile(wsId, fileName, ext)
    if (!created) throw new Error('Could not create the file in that workspace.')
    guestStore.updateFile(wsId, created.id, text, null, { forceTouch: true, touchWorkspace: true })
    if (isMove && sourceWorkspaceId && file && file.id) {
      guestStore.deleteFile(sourceWorkspaceId, file.id)
      guestStore.deleteFilesByNames(sourceWorkspaceId, [fileName])
    }
    return { workspace: guestStore.getWorkspace(wsId) || destWorkspace, fileId: created.id }
  }

  const created = await axios.post('/api/v1/file', {
    workspaceid: wsId,
    file_name: fileName,
    ext,
  }, API)
  const fileId = created.data && created.data.id
  if (!fileId) throw new Error('Could not create the file in that workspace.')
  await axios.put('/api/v1/file', { fileid: fileId, text, forceTouch: true }, API)
  if (isMove && file && file.id) {
    try {
      await axios.delete('/api/v1/file', {
        data: { fileid: file.id, workspaceid: sourceWorkspaceId || undefined },
        ...API,
      })
    } catch (err) {
      const msg = (err && err.message) ? err.message : 'unknown error'
      throw new Error('Saved to the destination, but could not remove the original file. ' + msg)
    }
  }
  return { workspace: destWorkspace, fileId }
}
