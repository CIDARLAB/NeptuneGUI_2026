/**
 * Local API server: user data in project root Data/ folder.
 * Data/Admin (admin cidar/12345), Data/Temp (guest), Data/Users/<username> (registered).
 */

const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')
const JSZip = require('jszip')
const data = require('./dataLayer')

// Optional: forward compile to Neptune_2026 (e.g. http://localhost:5000)
const NEPTUNE_COMPILE_URL = process.env.NEPTUNE_COMPILE_URL || ''

const app = express()
const PORT = process.env.PORT || 8080

app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

const COOKIE_NAME = 'neptune_sid'

function parseSession (req) {
  const raw = req.cookies[COOKIE_NAME]
  if (!raw) return null
  try {
    const parts = raw.split(':')
    if (parts[0] === 'admin' && parts[1]) return { type: 'admin', id: parts[1] }
    if (parts[0] === 'user' && parts[1]) return { type: 'user', id: parts[1] }
    if (parts[0] === 'guest' && parts[1]) return { type: 'guest', id: parts[1] }
  } catch (e) {}
  return null
}

function requireAuth (req, res, next) {
  const session = parseSession(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })
  req.session = session
  next()
}

data.ensureDirs()

// ---------- Auth ----------
app.post('/api/v2/register', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const result = data.createUser(String(username).trim(), password)
  if (result.error === 'username_taken') {
    return res.status(409).json({ message: 'Username already taken. Please choose another.', code: 'USERNAME_TAKEN' })
  }
  if (result.error) return res.status(400).json({ error: result.error })
  res.cookie(COOKIE_NAME, 'user:' + result.user.username, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 })
  res.json({ user: result.user })
})

app.post('/api/v2/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const u = String(username).trim()
  if (data.validateAdmin(u, password)) {
    res.cookie(COOKIE_NAME, 'admin:cidar', { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 })
    return res.json({ user: { _id: 'cidar', username: 'cidar', email: 'cidar', isAdmin: true } })
  }
  const user = data.validateUser(u, password)
  if (!user) return res.status(401).json({ error: 'Invalid username or password' })
  res.cookie(COOKIE_NAME, 'user:' + user.username, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 })
  res.json({ user })
})

app.get('/api/v2/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME)
  res.json({ ok: true })
})

// Forgot password: generate code and store (no email sent; code logged for dev / admin use)
function randomCode () {
  return String(Math.floor(100000 + Math.random() * 900000))
}
app.post('/api/v2/forgotPassword', (req, res) => {
  const { username } = req.body || {}
  const u = String(username || '').trim()
  if (!u) return res.status(400).json({ error: 'Username or email required' })
  // Admin account cannot use forgot password
  try {
    if (data.getAdmin().username === u) {
      return res.json({ message: 'If the account exists, a verification code has been sent. Please check your email.' })
    }
  } catch (e) {}
  if (!data.userExists(u)) {
    return res.json({ message: 'If the account exists, a verification code has been sent. Please check your email.' })
  }
  const code = randomCode()
  data.setResetCode(u, code)
  console.log('Neptune password reset code for', u, ':', code, '(valid 10 min)')
  res.json({ message: 'If the account exists, a code has been sent. Check your email or contact an administrator for the code.' })
})

app.post('/api/v2/resetPassword', (req, res) => {
  const { username, code, newPassword } = req.body || {}
  const u = String(username || '').trim()
  if (!u || !code || !newPassword) {
    return res.status(400).json({ error: 'Username, code and new password required' })
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }
  const stored = data.getResetCode(u)
  if (!stored || stored !== String(code).trim()) {
    return res.status(400).json({ error: 'Verification code is invalid or expired. Please request a new code.' })
  }
  data.updateUserPassword(u, newPassword)
  data.deleteResetCode(u)
  res.json({ message: 'Password reset successfully. Please log in with your new password.' })
})

app.get('/api/v2/user', requireAuth, (req, res) => {
  const s = req.session
  if (s.type === 'admin') return res.json({ _id: 'cidar', username: 'cidar', email: 'cidar', isAdmin: true })
  if (s.type === 'guest') return res.json({ _id: s.id, email: 'guest@session', isGuest: true })
  const u = data.getUser(s.id)
  if (!u) return res.status(401).json({ error: 'User not found' })
  res.json({ _id: u._id, username: u.username, email: u.email })
})

app.patch('/api/v2/user', requireAuth, (req, res) => {
  const s = req.session
  if (s.type === 'admin' || s.type === 'guest') return res.status(400).json({ error: 'Profile update not available for this account' })
  const { username, email } = req.body || {}
  const result = data.updateUserProfile(s.id, { username, email })
  if (result.error) {
    if (result.error === 'username_taken') return res.status(409).json({ error: 'Username already taken' })
    return res.status(400).json({ error: result.error })
  }
  if (result.user.username !== s.id) {
    res.cookie(COOKIE_NAME, 'user:' + result.user.username, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 })
  }
  res.json(result.user)
})

app.post('/api/v2/guest', (req, res) => {
  const sessionId = uuidv4()
  data.ensureSessionDir({ type: 'guest', id: sessionId })
  res.cookie(COOKIE_NAME, 'guest:' + sessionId, { httpOnly: true, maxAge: 24 * 3600 * 1000 })
  res.json({ user: { _id: sessionId, email: 'guest@session', isGuest: true } })
})

// ---------- Workspaces ----------
app.get('/api/v1/workspaces', requireAuth, (req, res) => {
  const ids = data.getWorkspaceIds(req.session)
  res.json(ids)
})

app.get('/api/v1/workspace', requireAuth, (req, res) => {
  const wid = req.query.workspace_id
  if (!wid) return res.status(400).json({ error: 'workspace_id required' })
  const w = data.getWorkspace(req.session, wid)
  if (!w) return res.status(404).json({ error: 'Workspace not found' })
  res.json(w)
})

app.post('/api/v1/workspace', requireAuth, (req, res) => {
  const name = (req.body && req.body.name) || 'Workspace'
  const w = data.createWorkspace(req.session, name)
  res.json(w)
})

app.delete('/api/v1/workspace', requireAuth, (req, res) => {
  const id = req.body && req.body.id
  if (!id) return res.status(400).json({ error: 'id required' })
  data.deleteWorkspace(req.session, id)
  res.json({ ok: true })
})

// ---------- Files ----------
app.get('/api/v1/files', requireAuth, (req, res) => {
  const workspaceId = req.query.id
  if (!workspaceId) return res.status(400).json({ error: 'id (workspace) required' })
  const ids = data.getFileIds(req.session, workspaceId)
  res.json(ids)
})

app.get('/api/v1/file', requireAuth, (req, res) => {
  const fileId = req.query.id
  if (!fileId) return res.status(400).json({ error: 'id required' })
  const workspaces = data.getWorkspaces(req.session)
  for (const w of workspaces) {
    const f = data.getFile(req.session, w._id, fileId)
    if (f) return res.json(f)
  }
  res.status(404).json({ error: 'File not found' })
})

app.get('/api/v1/fs', requireAuth, (req, res) => {
  const fileId = req.query.id
  if (!fileId) return res.status(400).json({ error: 'id required' })
  const workspaces = data.getWorkspaces(req.session)
  for (const w of workspaces) {
    const f = data.getFile(req.session, w._id, fileId)
    if (f) return res.type('text/plain').send(f.content || '')
  }
  res.status(404).json({ error: 'File not found' })
})

app.post('/api/v1/file', requireAuth, (req, res) => {
  const { file_name, ext, workspaceid } = req.body || {}
  const workspaceId = workspaceid && (workspaceid._id || workspaceid)
  if (!workspaceId || !file_name) return res.status(400).json({ error: 'workspaceid and file_name required' })
  const extStr = ext || (file_name.match(/\.[0-9a-z]+$/i) && file_name.match(/\.[0-9a-z]+$/i)[0]) || ''
  const f = data.createFile(req.session, workspaceId, file_name, extStr)
  if (!f) return res.status(404).json({ error: 'Workspace not found' })
  res.json(f)
})

app.put('/api/v1/file', requireAuth, (req, res) => {
  const { fileid, name, text } = req.body || {}
  if (!fileid) return res.status(400).json({ error: 'fileid required' })
  const workspaces = data.getWorkspaces(req.session)
  for (const w of workspaces) {
    const updated = data.updateFileContent(req.session, w._id, fileid, text, name)
    if (updated) return res.json(updated)
  }
  res.status(404).json({ error: 'File not found' })
})

app.delete('/api/v1/file', requireAuth, (req, res) => {
  const { fileid, workspaceid } = req.body || {}
  const workspaceId = workspaceid && (workspaceid._id || workspaceid)
  if (!fileid || !workspaceId) return res.status(400).json({ error: 'fileid and workspaceid required' })
  data.deleteFile(req.session, workspaceId, fileid)
  res.json({ ok: true })
})

app.get('/api/v1/downloadFile', requireAuth, (req, res) => {
  const fileId = req.query.id
  if (!fileId) return res.status(400).json({ error: 'id required' })
  const workspaces = data.getWorkspaces(req.session)
  for (const w of workspaces) {
    const f = data.getFile(req.session, w._id, fileId)
    if (f) {
      res.setHeader('Content-Disposition', 'attachment; filename="' + (f.name || 'file') + '"')
      return res.type('text/plain').send(f.content || '')
    }
  }
  res.status(404).json({ error: 'File not found' })
})

// ---------- Export: download all workspaces as a ZIP ----------
app.get('/api/v1/exportWorkspacesZip', requireAuth, async (req, res) => {
  try {
    const zip = new JSZip()
    const workspaces = data.getWorkspaces(req.session) || []

    zip.file('index.json', JSON.stringify({
      exportedAt: new Date().toISOString(),
      user: req.session && req.session.id ? String(req.session.id) : undefined,
      workspaceCount: workspaces.length,
    }, null, 2))

    const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_')

    for (let i = 0; i < workspaces.length; i++) {
      const w = workspaces[i]
      const wid = w && w._id != null ? String(w._id) : String(i + 1)
      const folderName = `workspace_${wid}_${safe(w && w.name ? w.name : 'Workspace')}`
      const folder = zip.folder(folderName)
      if (!folder) continue

      folder.file('metadata.json', JSON.stringify({
        _id: wid,
        name: w && w.name ? w.name : 'Workspace',
        notes: w && w.notes ? w.notes : '',
        updated_at: w && w.updated_at ? w.updated_at : null,
      }, null, 2))

      const files = data.getFiles(req.session, wid) || []
      for (let j = 0; j < files.length; j++) {
        const f = files[j]
        const base = safe(f && f.name ? f.name : `file_${j + 1}`)
        const ext = f && f.ext ? (String(f.ext).startsWith('.') ? String(f.ext) : `.${String(f.ext)}`) : ''
        folder.file(`${base}${ext || '.txt'}`, (f && f.content) ? String(f.content) : '')
      }
    }

    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="neptune_workspaces_${stamp}.zip"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: 'Failed to export workspaces zip' })
  }
})

// Import workspaces from a zip file.
// Request body: application/zip (raw bytes)
// Query:
// - dryRun=1: only report conflicts (no changes)
// - overwrite=1: overwrite conflicting workspaces by name
app.post(
  '/api/v1/importWorkspacesZip',
  requireAuth,
  express.raw({ type: 'application/zip', limit: '50mb' }),
  async (req, res) => {
    try {
      const buf = req.body
      if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
        return res.status(400).json({ error: 'Expected application/zip body' })
      }

      const dryRun = String(req.query.dryRun || '') === '1'
      const overwrite = String(req.query.overwrite || '') === '1'

      const zip = await JSZip.loadAsync(buf)

      const folderNames = Object.keys(zip.files)
        .filter(name => name.endsWith('/'))
        .filter(name => name.startsWith('workspace_'))

      const imported = []
      for (const folderName of folderNames) {
        const metaFile = zip.file(`${folderName}metadata.json`)
        if (!metaFile) continue
        let meta
        try {
          const metaStr = await metaFile.async('string')
          meta = JSON.parse(metaStr)
        } catch (_) {
          continue
        }
        const name = String((meta && meta.name) || '').trim()
        if (!name) continue

        const files = Object.keys(zip.files)
          .filter(p => p.startsWith(folderName) && p !== `${folderName}metadata.json` && !p.endsWith('/'))
          .map(p => p.substring(folderName.length))
        imported.push({ name, folderName, files })
      }

      const existing = data.getWorkspaces(req.session) || []
      const byName = new Map(existing.map(w => [String(w.name || '').trim().toLowerCase(), w]))
      const conflicts = imported
        .map(w => {
          const hit = byName.get(String(w.name).toLowerCase())
          return hit ? { name: w.name, existingWorkspaceId: hit._id } : null
        })
        .filter(Boolean)

      if (conflicts.length && !overwrite) {
        return res.status(409).json({
          error: 'conflicts',
          conflicts,
        })
      }

      if (dryRun) {
        return res.json({ ok: true, conflicts: [], importedCount: imported.length })
      }

      const overwritten = []
      const created = []

      for (const w of imported) {
        const hit = byName.get(String(w.name).toLowerCase())
        if (hit && overwrite) {
          overwritten.push(w.name)
          data.deleteWorkspaceDeep(req.session, hit._id)
        }

        const newWs = data.createWorkspace(req.session, w.name)
        created.push({ name: newWs.name, workspaceId: newWs._id })

        for (const rel of w.files) {
          const entry = zip.file(`${w.folderName}${rel}`)
          if (!entry) continue
          const content = await entry.async('string')
          const dot = rel.lastIndexOf('.')
          const base = dot > 0 ? rel.substring(0, dot) : rel
          const ext = dot > 0 ? rel.substring(dot) : ''
          const f = data.createFile(req.session, newWs._id, base, ext)
          if (!f) continue
          data.updateFileContent(req.session, newWs._id, f.id, content)
        }
      }

      return res.json({ ok: true, importedCount: created.length, overwritten, created })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to import zip' })
    }
  }
)

// ---------- Example scripts for Editor (from Data/example/flow_and_control_demo) ----------
app.get('/api/v1/exampleScript', requireAuth, (req, res) => {
  const lang = (req.query.lang || 'lfr').toString().toLowerCase()
  const baseDir = path.join(__dirname, '..', 'Data', 'example', 'flow_and_control_demo')
  let file = ''
  let outLang = 'lfr'
  if (lang === 'mint') {
    // MINT example script
    file = 'flow_and_control_demo.mint'
    outLang = 'mint'
  } else {
    // LFR example script
    file = 'flow_and_control_demo.lfr'
    outLang = 'lfr'
  }
  const fullPath = path.join(baseDir, file)
  fs.readFile(fullPath, 'utf8', (err, text) => {
    if (err) {
      return res.status(404).json({
        error: 'Example script not found in Data/example/flow_and_control_demo. Please check the files.',
      })
    }
    res.json({ code: text, lang: outLang })
  })
})

// Compile: proxy to Neptune_2026 when NEPTUNE_COMPILE_URL is set
function proxyCompile (req, res, path) {
  if (!NEPTUNE_COMPILE_URL) {
    return res.status(501).json({ error: 'Compile not configured. Set NEPTUNE_COMPILE_URL to Neptune_2026 URL (e.g. http://localhost:5000) or see RUN_LFR.md.' })
  }
  const url = NEPTUNE_COMPILE_URL.replace(/\/$/, '') + path
  axios.post(url, req.body, { timeout: 60000, validateStatus: () => true })
    .then((axRes) => res.status(axRes.status).json(axRes.data))
    .catch((err) => res.status(502).json({ error: 'Neptune_2026 compile error', message: err.message }))
}
app.post('/api/v1/fluigi', requireAuth, (req, res) => proxyCompile(req, res, '/api/v1/fluigi'))
app.post('/api/v1/mushroommapper', requireAuth, (req, res) => proxyCompile(req, res, '/api/v1/mushroommapper'))
app.get('/api/v1/jobs', requireAuth, (req, res) => {
  if (!NEPTUNE_COMPILE_URL) return res.json([])
  axios.get(NEPTUNE_COMPILE_URL.replace(/\/$/, '') + '/api/v1/jobs', { headers: req.headers, validateStatus: () => true })
    .then((axRes) => res.json(axRes.data || []))
    .catch(() => res.json([]))
})
app.get('/api/v1/job', requireAuth, (req, res) => {
  if (!NEPTUNE_COMPILE_URL) return res.json({ status: 'unknown' })
  const base = NEPTUNE_COMPILE_URL.replace(/\/$/, '')
  axios.get(base + '/api/v1/job', { params: req.query, timeout: 10000, validateStatus: () => true })
    .then((axRes) => res.json(axRes.data || { status: 'unknown' }))
    .catch(() => res.json({ status: 'unknown' }))
})

// ---------- Component Library (per-user; guest not persisted, use default on next load) ----------
app.get('/api/v1/componentLibrary', requireAuth, (req, res) => {
  if (req.session.type === 'guest') return res.json({ components: null })
  const lib = data.getComponentLibrary(req.session)
  res.json(lib ? { components: lib.components } : { components: null })
})

app.put('/api/v1/componentLibrary', requireAuth, (req, res) => {
  if (req.session.type === 'guest') return res.status(403).json({ error: 'Guest cannot persist component library' })
  const { components } = req.body || {}
  if (!Array.isArray(components)) return res.status(400).json({ error: 'components array required' })
  data.saveComponentLibrary(req.session, { components })
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log('Neptune Data server running at http://localhost:' + PORT)
  console.log('Data folder:', data.DATA_ROOT)
})
