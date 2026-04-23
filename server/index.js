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
    if (f) {
      const c = f.content
      const body = (c == null || c === '')
        ? ''
        : (typeof c === 'string' ? c : JSON.stringify(c))
      return res.type('text/plain').send(body)
    }
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
      const c = f.content
      const body = (c == null || c === '')
        ? ''
        : (typeof c === 'string' ? c : JSON.stringify(c))
      return res.type('text/plain').send(body)
    }
  }
  res.status(404).json({ error: 'File not found' })
})

// ---------- Export: download all workspaces as a ZIP ----------
app.get('/api/v1/exportWorkspacesZip', requireAuth, async (req, res) => {
  try {
    const zip = new JSZip()
    const workspaces = data.getWorkspaces(req.session) || []
    const componentLibrary = data.getComponentLibrary(req.session) || { customComponents: [] }

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

    // Keep component library table state in workspace export cache.
    zip.file('component_library.json', JSON.stringify(componentLibrary, null, 2))

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
      let importedComponentLibrary = null
      if (zip.files['component_library.json']) {
        try {
          const libRaw = await zip.files['component_library.json'].async('string')
          importedComponentLibrary = JSON.parse(libRaw)
        } catch (_) {
          importedComponentLibrary = null
        }
      }

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

      if (importedComponentLibrary && typeof importedComponentLibrary === 'object') {
        data.saveComponentLibrary(req.session, importedComponentLibrary)
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

// ---------- Component Library ----------
function normalizeCustomComponent (raw) {
  if (!raw || typeof raw !== 'object') return null
  const syntax = data.sanitizeComponentSyntax(raw.syntax || raw.name)
  const name = String(raw.name || raw.syntax || '').trim()
  const jsonScript = String(raw.jsonScript || '')
  const baseJsonScript = String(raw.baseJsonScript || raw.jsonScript || '')
  if (!syntax || !name || !jsonScript) return null
  return {
    syntax,
    name,
    sourceType: raw.sourceType === 'workspace' ? 'workspace' : 'upload',
    jsonScript,
    baseJsonScript: baseJsonScript || jsonScript,
  }
}

function readCustomComponents (session) {
  const lib = data.getComponentLibrary(session)
  if (!lib || !Array.isArray(lib.customComponents)) return []
  return lib.customComponents.map(normalizeCustomComponent).filter(Boolean)
}

function writeCustomComponents (session, customComponents) {
  return data.saveComponentLibrary(session, {
    customComponents: customComponents.map(normalizeCustomComponent).filter(Boolean),
  })
}

function removeCustomComponentFromSession (req, res, rawParam) {
  const syntax = data.sanitizeComponentSyntax(rawParam)
  if (!syntax) return res.status(400).json({ error: 'Invalid syntax' })
  const custom = readCustomComponents(req.session)
  const defaults = data.listDefaultComponentSyntaxes()

  let idx = custom.findIndex(c => c.syntax === syntax)
  if (idx >= 0) {
    custom.splice(idx, 1)
    writeCustomComponents(req.session, custom)
    return res.json({ ok: true })
  }

  if (defaults.includes(syntax)) {
    return res.status(400).json({ error: 'Built-in components cannot be removed from the library.' })
  }

  const nameHits = custom
    .map((c, i) => ({ i, c }))
    .filter(({ c }) => data.sanitizeComponentSyntax(c.name) === syntax)
  if (nameHits.length === 1) {
    custom.splice(nameHits[0].i, 1)
    writeCustomComponents(req.session, custom)
    return res.json({ ok: true })
  }
  if (nameHits.length > 1) {
    return res.status(400).json({
      error: 'Multiple imported entries share that display name. Use Remove on the specific row so the correct syntax id is used.',
    })
  }

  return res.status(404).json({
    error: 'Component not found in library. Custom rows are stored per login/guest session—refresh the page after signing in, or re-import if you switched accounts.',
  })
}

// Backward-compatible endpoint used by Editor syntax highlighting.
app.get('/api/v1/componentLibrary', requireAuth, (req, res) => {
  const defaults = data.listDefaultComponentSyntaxes().map(syntax => ({ syntax }))
  const custom = readCustomComponents(req.session).map(c => ({ syntax: c.syntax }))
  res.json({ components: [...defaults, ...custom] })
})

app.put('/api/v1/componentLibrary', requireAuth, (req, res) => {
  const { components } = req.body || {}
  if (!Array.isArray(components)) return res.status(400).json({ error: 'components array required' })
  const custom = []
  components.forEach((c) => {
    const syntax = data.sanitizeComponentSyntax(c && c.syntax)
    if (!syntax) return
    if (data.listDefaultComponentSyntaxes().includes(syntax)) return
    custom.push({
      syntax,
      name: String((c && c.name) || syntax),
      sourceType: 'upload',
      jsonScript: String((c && c.jsonScript) || '{}'),
      baseJsonScript: String((c && c.jsonScript) || '{}'),
    })
  })
  writeCustomComponents(req.session, custom)
  res.json({ ok: true })
})

function buildJsonViewScript (jsonScript, lfrText, mintText) {
  const sections = []
  if (lfrText) {
    sections.push(
      '// LFR reference (read-only)',
      ...String(lfrText).split('\n').map(line => `// ${line}`)
    )
  }
  if (mintText) {
    sections.push(
      '// MINT reference (read-only)',
      ...String(mintText).split('\n').map(line => `// ${line}`)
    )
  }
  if (sections.length) sections.push('// JSON payload used by 3DuF')
  return [...sections, String(jsonScript || '')].join('\n')
}

// Locate the single "primary" component-or-connection node in `jsonObj` for
// the given DIY syntax. The match rule is entirely structure-driven and
// works for any JSON file a user drops into Data/3DuF_component/default/JSON —
// there is no hardcoded list of known syntaxes:
//   1. Prefer a `components[*]` whose `entity` (case-insensitive) starts with
//      the syntax name (so `Valve.json` → VALVE3D, `Port.json` → PORT, etc.).
//   2. Otherwise prefer a `connections[*]` whose `entity` starts with the
//      syntax name (so `Channel.json` → CHANNEL).
//   3. Fall back to the first `components[0]` / `connections[0]` with params.
// Returns the actual node reference, so callers can both read its params and
// mutate them in place without re-walking the tree.
function findDiySourceNode (syntax, jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object') return null
  const upper = data.sanitizeComponentSyntax(syntax).toUpperCase()
  const hasParams = (n) => n && typeof n === 'object' && n.params && typeof n.params === 'object'
  const matchByEntity = (n) => {
    if (!hasParams(n)) return false
    const ent = String(n.entity || '').toUpperCase()
    return upper.length > 0 && ent.startsWith(upper)
  }
  if (Array.isArray(jsonObj.components)) {
    const hit = jsonObj.components.find(matchByEntity)
    if (hit) return hit
  }
  if (Array.isArray(jsonObj.connections)) {
    const hit = jsonObj.connections.find(matchByEntity)
    if (hit) return hit
  }
  if (Array.isArray(jsonObj.components)) {
    const hit = jsonObj.components.find(hasParams)
    if (hit) return hit
  }
  if (Array.isArray(jsonObj.connections)) {
    const hit = jsonObj.connections.find(hasParams)
    if (hit) return hit
  }
  return null
}

function pickEditableParams (syntax, jsonObj) {
  const src = findDiySourceNode(syntax, jsonObj)
  if (!src || !src.params) return {}
  const params = {}
  Object.keys(src.params).forEach((k) => {
    const v = src.params[k]
    if (typeof v === 'number' && Number.isFinite(v)) params[k] = v
  })
  return params
}

// In 3DuF JSON the same primary component/connection is mirrored inside
// `renderLayers[*].features[*]` and `layers[*].features[*]` (linked by
// `referenceID === <source.id>`). DIY edits need to be applied to the source
// node AND every mirror so the rendering and hit-testing stay consistent.
function collectDiyMirrorNodes (jsonObj, sourceId) {
  if (!sourceId) return []
  const mirrors = []
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!node || typeof node !== 'object') return
    if (node.referenceID === sourceId && node.params && typeof node.params === 'object') {
      mirrors.push(node)
    }
    Object.keys(node).forEach((k) => {
      if (k === 'params') return
      const v = node[k]
      if (v && typeof v === 'object') visit(v)
    })
  }
  if (jsonObj && typeof jsonObj === 'object') {
    if (jsonObj.renderLayers) visit(jsonObj.renderLayers)
    if (jsonObj.layers) visit(jsonObj.layers)
    if (jsonObj.features) visit(jsonObj.features)
  }
  return mirrors
}

// Apply DIY params ONLY to (a) the primary source node we picked for this
// syntax and (b) its render-layer / layer mirrors. The root device's
// `params` (canvas width / length) and unrelated components never receive
// the edits — this is the fix for the "editing a valve zeroed out the
// device canvas" regression.
function applyEditableParamsScoped (syntax, root, params) {
  const paramKeys = Object.keys(params || {}).filter(k => Number.isFinite(params[k]))
  if (!paramKeys.length) return
  const src = findDiySourceNode(syntax, root)
  if (!src || !src.params) return
  const targets = [src, ...collectDiyMirrorNodes(root, src.id)]
  targets.forEach((node) => {
    paramKeys.forEach((k) => {
      if (typeof node.params[k] === 'number') node.params[k] = params[k]
    })
  })
}

function formatScalar (v) {
  if (typeof v === 'number') return Number.isInteger(v) ? `${v}` : `${v}`
  return JSON.stringify(v)
}

function buildLfrText (syntax, params) {
  const safe = data.sanitizeComponentSyntax(syntax)
  const upper = String(safe || 'component').toUpperCase()
  const entries = Object.keys(params).sort().map(k => `${k}=${formatScalar(params[k])}`)
  return [
    '// Auto-generated from component DIY parameters.',
    `${upper} ${safe || 'component'}_1 ${entries.join(' ')};`,
    '',
  ].join('\n')
}

function buildMintText (syntax, params) {
  const safe = data.sanitizeComponentSyntax(syntax)
  const lines = Object.keys(params).sort().map(k => `  ${k}: ${formatScalar(params[k])};`)
  return [
    '// Auto-generated from component DIY parameters.',
    `device ${safe || 'component'}_1 {`,
    ...lines,
    '}',
    '',
  ].join('\n')
}

function buildComponentPayload (syntax, jsonObj, source) {
  const params = pickEditableParams(syntax, jsonObj)
  const lfrText = data.readTextIfExists(data.getComponentDefaultLfrPath(syntax))
  const mintText = data.readTextIfExists(data.getComponentDefaultMintPath(syntax))
  const jsonScript = JSON.stringify(jsonObj, null, 2)
  return {
    syntax: data.sanitizeComponentSyntax(syntax),
    name: data.sanitizeComponentSyntax(syntax),
    source,
    sourceType: 'default',
    showLfrMint: true,
    params,
    lfrScript: lfrText || buildLfrText(syntax, params),
    mintScript: mintText || buildMintText(syntax, params),
    jsonScript,
    jsonViewScript: buildJsonViewScript(jsonScript, lfrText, mintText),
  }
}

app.get('/api/v1/componentFiles', requireAuth, (req, res) => {
  const syntaxes = data.listDefaultComponentSyntaxes()
  const defaults = syntaxes.map((syntax) => {
    const loaded = data.loadComponentJson(syntax)
    if (!loaded) return null
    return buildComponentPayload(loaded.syntax, loaded.json, loaded.source)
  }).filter(Boolean)
  const custom = readCustomComponents(req.session).map((c) => {
    let jsonObj = null
    try { jsonObj = JSON.parse(c.jsonScript) } catch (_) { jsonObj = null }
    return {
      syntax: c.syntax,
      name: c.name,
      source: 'custom',
      sourceType: c.sourceType,
      showLfrMint: false,
      params: pickEditableParams(c.syntax, jsonObj || {}),
      lfrScript: '',
      mintScript: '',
      jsonScript: c.jsonScript,
      jsonViewScript: c.jsonScript,
    }
  })
  res.json({ components: [...defaults, ...custom] })
})

app.put('/api/v1/componentFiles/:syntax', requireAuth, (req, res) => {
  const syntax = data.sanitizeComponentSyntax(req.params.syntax)
  const rawParams = req.body && req.body.params
  if (!syntax) return res.status(400).json({ error: 'Invalid syntax' })
  if (!rawParams || typeof rawParams !== 'object' || Array.isArray(rawParams)) {
    return res.status(400).json({ error: 'params object required' })
  }
  const custom = readCustomComponents(req.session)
  const customIdx = custom.findIndex(c => c.syntax === syntax)
  const nextParams = {}
  Object.keys(rawParams).forEach((k) => {
    const n = Number(rawParams[k])
    if (Number.isFinite(n)) nextParams[k] = n
  })

  if (customIdx >= 0) {
    let parsed = null
    try { parsed = JSON.parse(custom[customIdx].jsonScript) } catch (_) { parsed = {} }
    applyEditableParamsScoped(custom[customIdx].syntax, parsed, nextParams)
    custom[customIdx].jsonScript = JSON.stringify(parsed, null, 2)
    writeCustomComponents(req.session, custom)
    return res.json({
      component: {
        syntax: custom[customIdx].syntax,
        name: custom[customIdx].name,
        source: 'custom',
        sourceType: custom[customIdx].sourceType,
        showLfrMint: false,
        params: pickEditableParams(custom[customIdx].syntax, parsed),
        lfrScript: '',
        mintScript: '',
        jsonScript: custom[customIdx].jsonScript,
        jsonViewScript: custom[customIdx].jsonScript,
      },
    })
  }

  // Always reset to the pristine default before applying the new params.
  // Reading from tmp (via loadComponentJson) would layer edits on top of the
  // previous tmp and compound any drift.
  const defaultPath = data.getComponentDefaultPath(syntax)
  if (!defaultPath || !fs.existsSync(defaultPath)) {
    return res.status(404).json({ error: 'Component JSON not found in Data/3DuF_component/default/JSON' })
  }
  let baseJson = null
  try { baseJson = JSON.parse(fs.readFileSync(defaultPath, 'utf8')) } catch (_) { baseJson = null }
  if (!baseJson) return res.status(500).json({ error: 'Failed to read default component JSON' })
  const nextJson = JSON.parse(JSON.stringify(baseJson))
  applyEditableParamsScoped(syntax, nextJson, nextParams)
  data.saveComponentTmpJson(syntax, nextJson)
  const updated = data.loadComponentJson(syntax)
  if (!updated) return res.status(500).json({ error: 'Failed to reload updated component JSON' })
  return res.json({ component: buildComponentPayload(syntax, updated.json, updated.source) })
})

app.post('/api/v1/componentFiles/:syntax/reset', requireAuth, (req, res) => {
  const syntax = data.sanitizeComponentSyntax(req.params.syntax)
  if (!syntax) return res.status(400).json({ error: 'Invalid syntax' })
  const custom = readCustomComponents(req.session)
  const customIdx = custom.findIndex(c => c.syntax === syntax)
  if (customIdx >= 0) {
    custom[customIdx].jsonScript = custom[customIdx].baseJsonScript || custom[customIdx].jsonScript
    writeCustomComponents(req.session, custom)
    let parsed = null
    try { parsed = JSON.parse(custom[customIdx].jsonScript) } catch (_) { parsed = {} }
    return res.json({
      component: {
        syntax: custom[customIdx].syntax,
        name: custom[customIdx].name,
        source: 'custom',
        sourceType: custom[customIdx].sourceType,
        showLfrMint: false,
        params: pickEditableParams(custom[customIdx].syntax, parsed),
        lfrScript: '',
        mintScript: '',
        jsonScript: custom[customIdx].jsonScript,
        jsonViewScript: custom[customIdx].jsonScript,
      },
    })
  }
  data.resetComponentTmpJson(syntax)
  const loaded = data.loadComponentJson(syntax)
  if (!loaded) return res.status(404).json({ error: 'Component JSON not found in Data/3DuF_component/default/JSON' })
  res.json({ component: buildComponentPayload(syntax, loaded.json, loaded.source) })
})

app.delete('/api/v1/componentFiles/:syntax', requireAuth, (req, res) => {
  removeCustomComponentFromSession(req, res, req.params.syntax)
})

app.post('/api/v1/componentFiles/remove', requireAuth, (req, res) => {
  const s = req.body && req.body.syntax
  if (s == null || String(s).trim() === '') {
    return res.status(400).json({ error: 'syntax required in JSON body' })
  }
  removeCustomComponentFromSession(req, res, s)
})

app.post('/api/v1/componentFiles/upload', requireAuth, (req, res) => {
  const { name, jsonText, syntax: preferredSyntaxField } = req.body || {}
  const displayName = String(name || '').trim()
  const raw = String(jsonText || '').trim()
  if (!displayName) return res.status(400).json({ error: 'name required' })
  if (!raw) return res.status(400).json({ error: 'jsonText required' })
  let parsed = null
  try { parsed = JSON.parse(raw) } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON content' })
  }
  const defaults = new Set(data.listDefaultComponentSyntaxes())
  const custom = readCustomComponents(req.session)
  const used = new Set([...defaults, ...custom.map(c => c.syntax)])
  const base = data.sanitizeComponentSyntax(displayName)
  if (!base) return res.status(400).json({ error: 'name must contain letters or numbers' })
  const preferred = data.sanitizeComponentSyntax(
    preferredSyntaxField != null && preferredSyntaxField !== ''
      ? String(preferredSyntaxField)
      : ''
  )
  let syntax
  if (preferred && !used.has(preferred)) {
    syntax = preferred
  } else {
    syntax = base
    let n = 1
    while (used.has(syntax)) {
      n++
      syntax = `${base}_${n}`
    }
  }
  custom.push({
    syntax,
    name: displayName,
    sourceType: 'upload',
    jsonScript: JSON.stringify(parsed, null, 2),
    baseJsonScript: JSON.stringify(parsed, null, 2),
  })
  writeCustomComponents(req.session, custom)
  res.json({ ok: true, syntax })
})

app.post('/api/v1/componentFiles/importWorkspaceJson', requireAuth, (req, res) => {
  const { fileid, name } = req.body || {}
  const displayName = String(name || '').trim()
  if (!fileid) return res.status(400).json({ error: 'fileid required' })
  if (!displayName) return res.status(400).json({ error: 'name required' })
  const workspaces = data.getWorkspaces(req.session)
  let file = null
  for (const w of workspaces) {
    const f = data.getFile(req.session, w._id, fileid)
    if (f) { file = f; break }
  }
  if (!file) return res.status(404).json({ error: 'Workspace file not found' })
  const raw = String(file.content || '')
  let parsed = null
  try { parsed = JSON.parse(raw) } catch (e) {
    return res.status(400).json({ error: 'Selected workspace file is not valid JSON' })
  }
  const defaults = new Set(data.listDefaultComponentSyntaxes())
  const custom = readCustomComponents(req.session)
  const used = new Set([...defaults, ...custom.map(c => c.syntax)])
  const base = data.sanitizeComponentSyntax(displayName)
  if (!base) return res.status(400).json({ error: 'name must contain letters or numbers' })
  let syntax = base
  let n = 1
  while (used.has(syntax)) {
    n++
    syntax = `${base}_${n}`
  }
  custom.push({
    syntax,
    name: displayName,
    sourceType: 'workspace',
    jsonScript: JSON.stringify(parsed, null, 2),
    baseJsonScript: JSON.stringify(parsed, null, 2),
  })
  writeCustomComponents(req.session, custom)
  res.json({ ok: true, syntax })
})

app.listen(PORT, () => {
  console.log('Neptune Data server running at http://localhost:' + PORT)
  console.log('Data folder:', data.DATA_ROOT)
})
