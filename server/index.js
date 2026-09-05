/**
 * Local API server: user data in project root Data/ folder.
 * Data/Admin (admin cidar/12345), Data/Temp (guest), Data/Users/<username> (registered).
 */

const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFile } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')
const JSZip = require('jszip')
const data = require('./dataLayer')
const { seedBundledDataIfNeeded } = require('./seedData')
const {
  mergeComponentBundles,
  toCompileComponentBundle,
  normalizeWorkspaceLfrBundle,
  normalizeImportLfr,
} = require('./componentBundle')
const {
  runLocalCompile,
  pickPrimaryPrJson,
  pickPrimaryMint,
  siblingMintFileName,
  collectLogText,
  logFileNameFor,
  isLfrCompileType,
} = require('./compileRunner')
const {
  isPrJsonFileName,
  isWorkspaceVisibleFileName,
  isZipCompileSidecar,
  shouldKeepCompileGeneratedFile,
} = require('./compileOutputFiles')

// Optional: forward compile to Modal. If unset, run fluigi locally via Neptune_2026.
const NEPTUNE_COMPILE_URL = process.env.NEPTUNE_COMPILE_URL || ''

const app = express()
const PORT = process.env.PORT || 8080
const NEPTUNE_2026_ROOT = process.env.NEPTUNE_2026_ROOT || path.resolve(__dirname, '..', '..', 'Neptune_2026')

app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
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

/**
 * Called once each time the Neptune GUI document loads (online guest mode).
 * Clears guest Temp session when cookie is guest; clears imported component rows for
 * user/admin cookies too (legacy login otherwise keeps uploads such as "terrace").
 * Always removes Data/3DuF_component/tmp JSON overrides and in-memory compile jobs
 * for the current cookie — otherwise Dashboard/Jobs would restore previous run files.
 */
app.post('/api/v2/guest/clearBrowserReloadState', (req, res) => {
  const clearedTmp = !!data.clearAllComponentTmpJsonFiles()
  const session = parseSession(req)
  let clearedSession = false
  let clearedJobs = false
  if (session) {
    clearedJobs = !!clearSessionJobs(session)
    if (session.type === 'guest') {
      clearedSession = !!data.clearGuestSessionUserData(session)
    } else if (session.type === 'user' || session.type === 'admin') {
      clearedSession = !!data.clearSessionImportedComponents(session)
    }
  }
  return res.json({ ok: true, clearedSession, clearedTmp, clearedJobs })
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
  const notes = (req.body && req.body.notes) || ''
  const w = data.createWorkspace(req.session, name, notes)
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
    const jobs = sessionJobRecords(req.session)
    const withFiles = workspaces.map((w) => ({
      ...w,
      files: (data.getFiles(req.session, w._id) || []).filter((f) =>
        f && isWorkspaceVisibleFileName(f.name)
      ),
    }))

    const merged = (() => {
      const list = withFiles.map((w) => ({ ...w, files: [...(w.files || [])] }))
      const byId = new Map(list.map((w) => [String(w._id), w]))
      const byName = new Map(list.map((w) => [String(w.name || '').trim().toLowerCase(), w]))
      jobs.forEach((job) => {
        const w = byId.get(String(job.workspaceId || '')) ||
          byName.get(String(job.workspaceName || '').trim().toLowerCase())
        if (!w) return
        const names = new Set((w.files || []).map((f) => f && f.name).filter(Boolean))
        const extras = compileZipFilesFromJob(job)
        extras.forEach((f) => {
          if (!f || !f.name || names.has(f.name)) return
          names.add(f.name)
          w.files.push({ name: f.name, content: f.content, ext: path.extname(f.name) })
        })
      })
      return list
    })()

    zip.file('index.json', JSON.stringify({
      exportedAt: new Date().toISOString(),
      user: req.session && req.session.id ? String(req.session.id) : undefined,
      workspaceCount: merged.length,
    }, null, 2))
    zip.file('jobs.json', JSON.stringify(jobs, null, 2))
    zip.file('component_library.json', JSON.stringify(componentLibrary, null, 2))
    try {
      zip.file('component_table.json', JSON.stringify({
        components: listComponentFilePayloads(req.session),
      }, null, 2))
    } catch (_) {}

    merged.forEach((w, i) => {
      const wid = w && w._id != null ? String(w._id) : String(i + 1)
      const raw = (w && w.name) || 'Workspace'
      const safe = String(raw).replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_')
      const folder = zip.folder(`workspace_${wid}_${safe || 'Workspace'}`)
      if (!folder) return
      folder.file('metadata.json', JSON.stringify({
        _id: wid,
        name: w && w.name ? w.name : 'Workspace',
        notes: w && w.notes ? w.notes : '',
        updated_at: w && w.updated_at ? w.updated_at : null,
      }, null, 2))
      ;(w.files || []).forEach((f, j) => {
        const name = zipSafeFileName(f && f.name ? f.name : `file_${j + 1}`)
        if (!name || name === 'metadata.json') return
        const kind = backupFolderForFile(name)
        folder.file(`${kind}/${name}`, f && f.content != null ? String(f.content) : '')
      })
    })

    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    const stamp = filenameStamp(new Date())
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="neptune_${stamp}.zip"`)
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

      let importedJobs = []
      if (zip.files['jobs.json']) {
        try {
          importedJobs = JSON.parse(await zip.files['jobs.json'].async('string'))
        } catch (_) {
          importedJobs = []
        }
      }

      const folderNames = listWorkspaceFolderNames(zip)

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
          const fileName = fileNameFromZipRel(rel)
          if (!fileName || fileName === 'metadata.json') continue
          if (!isWorkspaceVisibleFileName(fileName)) continue
          const ext = path.extname(fileName)
          const f = data.createFile(req.session, newWs._id, fileName, ext)
          if (!f) continue
          data.updateFileContent(req.session, newWs._id, f.id, content)
        }
      }

      if (importedComponentLibrary && typeof importedComponentLibrary === 'object') {
        data.saveComponentLibrary(req.session, importedComponentLibrary)
      }

      if (Array.isArray(importedJobs) && importedJobs.length) {
        restoreSessionJobs(req.session, importedJobs, { replace: true })
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

function listComponentFilePayloads (session) {
  const syntaxes = data.listDefaultComponentSyntaxes()
  const defaults = syntaxes.map((syntax) => {
    const loaded = data.loadComponentJson(syntax)
    if (!loaded) return null
    return buildComponentPayload(loaded.syntax, loaded.json, loaded.source)
  }).filter(Boolean)
  const custom = readCustomComponents(session).map((c) => {
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
  return [...defaults, ...custom]
}

// Per-session compile jobs. IDs are listed from /api/v1/jobs; details live in
// jobRecords (local fluigi) and are merged with Modal results when configured.
const sessionJobs = new Map()
const jobRecords = new Map()

function sessionKey (session) {
  return session ? `${session.type}:${session.id}` : 'anon'
}

function recordSessionJob (session, jobId) {
  if (!jobId || typeof jobId !== 'string') return
  const key = sessionKey(session)
  const list = sessionJobs.get(key) || []
  if (!list.includes(jobId)) {
    list.unshift(jobId)
    sessionJobs.set(key, list.slice(0, 100))
  }
}

function publicJobRecord (record) {
  if (!record || typeof record !== 'object') return { status: 'unknown' }
  return {
    id: record.id,
    status: record.status || 'running',
    returncode: record.returncode,
    sourceFilename: record.sourceFilename || '',
    workspaceId: record.workspaceId || null,
    workspaceName: record.workspaceName || '',
    compileType: record.compileType || '',
    created_at: record.created_at,
    updated_at: record.updated_at,
    files: Array.isArray(record.files) ? record.files : [],
    evaluation: record.evaluation || null,
    log: record.log || '',
    jsonText: record.jsonText || '',
    outputFileName: record.outputFileName || '',
    logFileName: record.logFileName || '',
    generatedFiles: Array.isArray(record.generatedFiles) ? record.generatedFiles : [],
    error: record.error || '',
    fluigiCmd: record.fluigiCmd || [],
    backend: record.backend || '',
  }
}

function filenameStamp (date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
}

function stampGeneratedFilename (filename, stamp) {
  const baseName = path.basename(String(filename || 'output'))
  const ext = path.extname(baseName)
  const stem = ext ? baseName.slice(0, -ext.length) : baseName
  if (/\(\d{12}\)$/.test(stem)) return baseName
  return `${stem}(${stamp})${ext}`
}

function evaluationFileNameFromPr (outputFileName, stamp) {
  const base = String(outputFileName || 'design').replace(/\.json$/i, '')
  const m = base.match(/^(.*)\((\d{12})\)$/)
  if (m) return `${m[1]}_evaluation(${m[2]}).json`
  return `${base}_evaluation(${stamp}).json`
}

function compileZipFilesFromJob (job) {
  if (!job || typeof job !== 'object') return []
  const extras = []
  const seen = new Set()
  const add = (f) => {
    if (!f || !f.name || seen.has(f.name)) return
    if (!isWorkspaceVisibleFileName(f.name) && !isZipCompileSidecar(f.name)) return
    seen.add(f.name)
    extras.push({ name: f.name, content: f.content == null ? '' : f.content })
  }
  ;(job.generatedFiles || []).forEach(add)
  if (job.outputFileName && job.jsonText) {
    add({ name: job.outputFileName, content: job.jsonText })
  }
  if (job.logFileName && job.log) {
    add({ name: job.logFileName, content: job.log })
  }
  if (job.evaluation && !extras.some((f) => /evaluation/i.test(f.name))) {
    const stampMatch = String(job.outputFileName || '').match(/\((\d{12})\)\.[^.]+$/)
    const stamp = stampMatch ? stampMatch[1] : filenameStamp(new Date())
    add({
      name: evaluationFileNameFromPr(job.outputFileName, stamp),
      content: JSON.stringify(job.evaluation, null, 2),
    })
  }
  return extras
}

function listWorkspaceFolderNames (zip) {
  const folders = new Set()
  Object.keys((zip && zip.files) || {}).forEach((name) => {
    const m = String(name).match(/^(workspace_[^/]+)\/?/)
    if (m) folders.add(`${m[1]}/`)
  })
  return [...folders]
}

function sessionJobRecords (session) {
  const ids = sessionJobs.get(sessionKey(session)) || []
  return ids.map((id) => jobRecords.get(id)).filter(Boolean).map(publicJobRecord)
}

function relinkJobFiles (session, workspaceId, job) {
  if (!session || !workspaceId) return []
  const files = data.getFiles(session, workspaceId) || []
  const ids = []
  const wanted = new Set()
  ;(job.generatedFiles || []).forEach((f) => { if (f && f.name && isWorkspaceVisibleFileName(f.name)) wanted.add(f.name) })
  if (job.outputFileName && isWorkspaceVisibleFileName(job.outputFileName)) wanted.add(job.outputFileName)
  files.forEach((f) => {
    if (f && wanted.has(f.name) && f.id) ids.push(f.id)
  })
  return ids
}

function generatedNamesForJob (record) {
  const names = new Set()
  if (!record) return []
  if (record.outputFileName) names.add(record.outputFileName)
  if (record.logFileName) names.add(record.logFileName)
  ;(record.generatedFiles || []).forEach((f) => {
    if (f && f.name) names.add(f.name)
  })
  return [...names]
}

/** Drop in-memory compile jobs for this cookie so a later GUI load cannot revive them. */
function clearSessionJobs (session) {
  if (!session) return false
  const key = sessionKey(session)
  const ids = sessionJobs.get(key) || []
  ids.forEach((id) => jobRecords.delete(id))
  sessionJobs.delete(key)
  return true
}

function deleteSessionJob (session, jobId) {
  const id = String(jobId || '')
  if (!id) return { ok: false, error: 'id required' }
  const key = sessionKey(session)
  const ids = sessionJobs.get(key) || []
  if (!ids.includes(id)) return { ok: false, error: 'not_found' }
  const record = jobRecords.get(id) || {}
  const fileNames = generatedNamesForJob(record)
  const workspaceId = record.workspaceId || null
  // Workspace compile artifacts only. Component Library imports are independent
  // copies and must not be removed when a job or workspace result is deleted.
  if (session && workspaceId) {
    const files = data.getFiles(session, workspaceId) || []
    files.forEach((f) => {
      if (f && fileNames.includes(f.name)) data.deleteFile(session, workspaceId, f.id)
    })
  }
  jobRecords.delete(id)
  sessionJobs.set(key, ids.filter((x) => x !== id))
  return { ok: true, id, workspaceId, fileNames }
}

function restoreSessionJobs (session, jobs, { replace } = { replace: true }) {
  const key = sessionKey(session)
  if (replace) {
    const oldIds = sessionJobs.get(key) || []
    oldIds.forEach((id) => jobRecords.delete(id))
    sessionJobs.set(key, [])
  }
  const workspaces = data.getWorkspaces(session) || []
  const byName = new Map(workspaces.map((w) => [String(w.name || '').trim().toLowerCase(), w]))
  const restored = []
  ;(Array.isArray(jobs) ? jobs : []).forEach((job) => {
    if (!job || typeof job !== 'object') return
    const name = String(job.workspaceName || '').trim()
    const hit = name ? byName.get(name.toLowerCase()) : null
    const workspaceId = hit ? hit._id : (job.workspaceId || null)
    const generatedFiles = (Array.isArray(job.generatedFiles) ? job.generatedFiles : [])
      .filter((f) => f && f.name && shouldKeepCompileGeneratedFile(f.name))
    generatedFiles.forEach((f) => {
      if (!f || !f.name || f.content == null || !workspaceId) return
      if (!isWorkspaceVisibleFileName(f.name)) return
      upsertWorkspaceFile(session, workspaceId, f.name, f.content, job.workspaceName)
    })
    if (job.outputFileName && job.jsonText && workspaceId && isWorkspaceVisibleFileName(job.outputFileName)) {
      upsertWorkspaceFile(session, workspaceId, job.outputFileName, job.jsonText)
    }
    const id = uuidv4()
    const record = {
      id,
      status: job.status || 'done',
      returncode: job.returncode,
      sourceFilename: job.sourceFilename || '',
      workspaceId,
      workspaceName: job.workspaceName || (hit && hit.name) || '',
      compileType: job.compileType || '',
      created_at: job.created_at || new Date().toISOString(),
      updated_at: job.updated_at || new Date().toISOString(),
      evaluation: job.evaluation || null,
      log: job.log || '',
      jsonText: job.jsonText || '',
      outputFileName: job.outputFileName || '',
      logFileName: job.logFileName || '',
      generatedFiles,
      error: job.error || '',
      fluigiCmd: Array.isArray(job.fluigiCmd) ? job.fluigiCmd : [],
      backend: job.backend || 'imported',
      session,
    }
    record.files = relinkJobFiles(session, workspaceId, record)
    jobRecords.set(id, record)
    recordSessionJob(session, id)
    restored.push(id)
  })
  return restored
}

function backupFolderForFile (fileName) {
  const n = String(fileName || '')
  const lower = n.toLowerCase()
  if (/evaluation/i.test(n) && lower.endsWith('.json')) return 'evaluation'
  if (lower.endsWith('.lfr')) return 'LFR'
  if (lower.endsWith('.mint')) return 'MINT'
  if (lower.endsWith('.json')) return 'JSON'
  if (lower.endsWith('.log')) return 'log'
  return 'other'
}

function zipSafeFileName (name) {
  const base = String(name == null ? 'file' : name).split(/[/\\]/).pop() || 'file'
  return base.replace(/\0/g, '')
}

function fileNameFromZipRel (rel) {
  const parts = String(rel || '').split('/').filter(Boolean)
  return zipSafeFileName(parts[parts.length - 1] || rel || 'file')
}

function shouldSaveCompileOutput (relPath) {
  const base = path.basename(String(relPath || ''))
  const ext = path.extname(base).toLowerCase()
  if (base === 'component_library.json') return false
  if (ext === '.dot' || ext === '.log' || ext === '.txt') return false
  if (ext === '.json') return isPrJsonFileName(base)
  return ext === '.mint'
}

function upsertWorkspaceFile (session, workspaceId, fileName, content, workspaceName) {
  if (!session || !workspaceId || !fileName) return null
  data.ensureWorkspace(session, workspaceId, workspaceName)
  const existingList = data.getFiles(session, workspaceId) || []
  const existing = existingList.find(f => f && f.name === fileName)
  if (existing) {
    return data.updateFileContent(session, workspaceId, existing.id, content) || existing
  }
  const ext = path.extname(fileName) || ''
  const created = data.createFile(session, workspaceId, fileName, ext)
  if (!created) return null
  return data.updateFileContent(session, workspaceId, created.id, content) || created
}

function removeHiddenCompileArtifactsFromWorkspace (session, workspaceId) {
  if (!session || !workspaceId) return
  const files = data.getFiles(session, workspaceId) || []
  files.forEach((f) => {
    if (f && f.id && f.name && !isWorkspaceVisibleFileName(f.name)) {
      data.deleteFile(session, workspaceId, f.id)
    }
  })
}

function toJobEvaluation (metrics) {
  if (!metrics || typeof metrics !== 'object') return null
  const areaScore = Number(metrics.area_score ?? metrics.areaScore)
  const compactScore = Number(metrics.compact_score ?? metrics.compactScore)
  const connectionLengthScore = Number(metrics.connection_length_score ?? metrics.connectionLengthScore)
  const bendScore = Number(metrics.bend_score ?? metrics.bendScore)
  const symmetryScore = Number(metrics.symmetry_score ?? metrics.symmetryScore)
  const fragmentationScore = Number(metrics.fragmentation_score ?? metrics.fragmentationScore)
  const overallScore = Number(metrics.overall_score ?? metrics.overallScore ?? metrics.total_score)
  if (![areaScore, compactScore, connectionLengthScore, bendScore, symmetryScore, fragmentationScore]
    .every(Number.isFinite)) {
    return null
  }
  return {
    areaScore,
    compactScore,
    connectionLengthScore,
    bendScore,
    symmetryScore,
    fragmentationScore,
    overallScore: Number.isFinite(overallScore) ? overallScore : null,
    area_score: areaScore,
    compact_score: compactScore,
    connection_length_score: connectionLengthScore,
    bend_score: bendScore,
    symmetry_score: symmetryScore,
    fragmentation_score: fragmentationScore,
    overall_score: Number.isFinite(overallScore) ? overallScore : null,
  }
}

function createPendingJob (session, meta) {
  const id = uuidv4()
  const now = new Date().toISOString()
  const ws = meta.workspaceId
    ? data.ensureWorkspace(session, meta.workspaceId, meta.workspaceName)
    : null
  const record = {
    id,
    status: 'running',
    sourceFilename: meta.sourceFilename || '',
    workspaceId: meta.workspaceId || null,
    workspaceName: meta.workspaceName || (ws && ws.name) || '',
    compileType: meta.compileType || '',
    created_at: now,
    updated_at: now,
    files: [],
    evaluation: null,
    log: '',
    jsonText: '',
    outputFileName: '',
    logFileName: logFileNameFor(meta.sourceFilename, meta.compileType),
    error: '',
    fluigiCmd: [],
    backend: meta.backend || 'local',
    session,
  }
  jobRecords.set(id, record)
  recordSessionJob(session, id)
  return record
}

function applyCompileResult (record, result, session) {
  const now = new Date().toISOString()
  const stamp = filenameStamp(new Date())
  record.updated_at = now
  record.returncode = result.returncode
  record.fluigiCmd = result.fluigiCmd || record.fluigiCmd
  record.log = result.log || collectLogText(result.outputs || {}, result.stdout, result.stderr, result.error)
  record.error = result.error || ''
  const mintOnly = record.compileType === 'lfrToMint'
  const mintHit = mintOnly ? (pickPrimaryMint(result.outputs || {}) || null) : null
  const success = mintOnly
    ? (result.returncode === 0 && mintHit && mintHit.text)
    : (result.returncode === 0 && result.primaryJson && result.primaryJson.text)
  record.status = success ? 'done' : 'error'
  const generatedFiles = []
  if (success && mintOnly) {
    record.jsonText = ''
    record.outputFileName = siblingMintFileName(record.sourceFilename)
  } else if (success) {
    record.jsonText = result.primaryJson.text
    const rawJsonName = result.primaryJson.basename || path.basename(result.primaryJson.name)
    record.outputFileName = stampGeneratedFilename(rawJsonName, stamp)
  }
  record.logFileName = stampGeneratedFilename(
    record.logFileName || logFileNameFor(record.sourceFilename, record.compileType),
    stamp
  )

  const seen = new Set()
  const saveNamed = (fileName, content, { toWorkspace } = {}) => {
    if (!fileName || content == null) return
    if (seen.has(fileName)) return
    if (!shouldKeepCompileGeneratedFile(fileName)) return
    seen.add(fileName)
    generatedFiles.push({ name: fileName, content: String(content) })
    const writeWorkspace = toWorkspace !== false && isWorkspaceVisibleFileName(fileName)
    if (!writeWorkspace || !session || !record.workspaceId) return
    const saved = upsertWorkspaceFile(session, record.workspaceId, fileName, content, record.workspaceName)
    if (saved && saved.id) record.files = [...(record.files || []), saved.id]
  }

  record.files = []
  if (success && mintOnly && record.outputFileName && mintHit && mintHit.text) {
    saveNamed(record.outputFileName, mintHit.text)
  } else if (success && record.outputFileName && record.jsonText) {
    saveNamed(record.outputFileName, record.jsonText)
  }
  if (mintOnly) {
    if (record.log) {
      saveNamed(record.logFileName, record.log, { toWorkspace: false })
    }
    record.generatedFiles = generatedFiles
    if (session && record.workspaceId) {
      removeHiddenCompileArtifactsFromWorkspace(session, record.workspaceId)
    }
    return record
  }
  Object.keys(result.outputs || {}).forEach((rel) => {
    if (!shouldSaveCompileOutput(rel)) return
    const ext = path.extname(rel).toLowerCase()
    if (ext === '.log') return
    let base = path.basename(rel)
    if (success && record.outputFileName && ext === '.json') {
      const unstamped = record.outputFileName.replace(/\(\d{12}\)(?=\.[^.]+$)/, '')
      if (base === unstamped || base === record.outputFileName) return
    }
    // LFR compiles must expose MINT as *_fromLFR.mint (not bare <stem>.mint).
    if (ext === '.mint' && isLfrCompileType(record.compileType)) {
      const preferred = siblingMintFileName(record.sourceFilename || base)
      base = stampGeneratedFilename(preferred, stamp)
    } else {
      base = stampGeneratedFilename(base, stamp)
    }
    saveNamed(base, result.outputs[rel])
  })
  if (record.log) {
    saveNamed(record.logFileName, record.log, { toWorkspace: false })
  }
  record.generatedFiles = generatedFiles
  if (session && record.workspaceId) {
    removeHiddenCompileArtifactsFromWorkspace(session, record.workspaceId)
  }
  return record
}

async function attachEvaluation (record) {
  if (!record || record.status !== 'done' || !record.jsonText) return record
  try {
    const design = JSON.parse(record.jsonText)
    const metrics = await computeEvaluationMetricWithNeptune(design)
    record.evaluation = toJobEvaluation(metrics)
    if (record.evaluation && record.outputFileName) {
      const stampMatch = String(record.outputFileName).match(/\((\d{12})\)\.[^.]+$/)
      const stamp = stampMatch ? stampMatch[1] : filenameStamp(new Date())
      const evalName = evaluationFileNameFromPr(record.outputFileName, stamp)
      const evalText = JSON.stringify(record.evaluation, null, 2)
      record.generatedFiles = Array.isArray(record.generatedFiles) ? record.generatedFiles : []
      if (!record.generatedFiles.some((f) => f && f.name === evalName)) {
        record.generatedFiles.push({ name: evalName, content: evalText })
      }
    }
  } catch (err) {
    if (!record.log) record.log = ''
    const msg = err && err.message ? err.message : String(err)
    record.log = `${record.log}\n\n[evaluation] ${msg}`.trim()
  }
  return record
}

function enrichCompileRequest (req) {
  const body = req.body || {}
  const {
    sourcefileid,
    configfileid,
    workspace: workspaceId,
    workspaceName,
    sourcefilename,
    configfilename,
    componentBundle: clientBundle,
    sourceContent: clientSourceContent,
    importLfr: clientImportLfr,
    workspaceLfrBundle: clientWorkspaceLfr,
  } = body
  let sourceContent = ''
  let configContent = ''
  if (typeof clientSourceContent === 'string' && clientSourceContent.length > 0) {
    sourceContent = clientSourceContent
  } else if (sourcefileid && workspaceId) {
    const f = data.getFile(req.session, workspaceId, sourcefileid)
    if (f && f.content != null) sourceContent = typeof f.content === 'string' ? f.content : JSON.stringify(f.content)
  }
  if (configfileid && workspaceId) {
    const f = data.getFile(req.session, workspaceId, configfileid)
    if (f && f.content != null) configContent = typeof f.content === 'string' ? f.content : JSON.stringify(f.content)
  }
  const serverComponents = listComponentFilePayloads(req.session)
  const mergedComponents = mergeComponentBundles(serverComponents, clientBundle)
  const componentBundle = toCompileComponentBundle(mergedComponents)
  let importLfr = normalizeImportLfr(clientImportLfr)
  if (!importLfr.length) {
    importLfr = normalizeImportLfr(
      normalizeWorkspaceLfrBundle(clientWorkspaceLfr).map((e) => ({
        path: `${e.workspaceName}/${e.fileName}`,
        content: e.content,
      }))
    )
  }
  const ws = workspaceId ? data.getWorkspace(req.session, workspaceId) : null
  return {
    sourceContent,
    configContent,
    componentBundle,
    importLfr,
    sourcefilename: sourcefilename || '',
    configfilename: configfilename || '',
    workspaceId: workspaceId || null,
    workspaceName: workspaceName || (ws && ws.name) || '',
  }
}

function startLocalCompileJob (req, compileType) {
  const enriched = enrichCompileRequest(req)
  const record = createPendingJob(req.session, {
    sourceFilename: enriched.sourcefilename,
    workspaceId: enriched.workspaceId,
    workspaceName: enriched.workspaceName,
    compileType,
    backend: 'local',
  })
  runLocalCompile({
    neptuneRoot: NEPTUNE_2026_ROOT,
    compileType,
    sourceContent: enriched.sourceContent,
    sourceFilename: enriched.sourcefilename,
    configContent: enriched.configContent,
    configFilename: enriched.configfilename,
    componentBundle: enriched.componentBundle,
    importLfr: enriched.importLfr,
  }).then(async (result) => {
    applyCompileResult(record, result, req.session)
    await attachEvaluation(record)
    record.updated_at = new Date().toISOString()
    jobRecords.set(record.id, record)
    const cmd = (result.fluigiCmd || []).join(' ')
    console.log(`[compile ${record.id}] ${record.status} rc=${result.returncode} ${cmd}`)
  }).catch((err) => {
    record.status = 'error'
    record.error = err && err.message ? err.message : String(err)
    record.log = record.error
    record.updated_at = new Date().toISOString()
    jobRecords.set(record.id, record)
    console.error(`[compile ${record.id}] failed`, err)
  })
  return record.id
}

function startModalCompileJob (req, res, routePath, compileType) {
  const enriched = enrichCompileRequest(req)
  const record = createPendingJob(req.session, {
    sourceFilename: enriched.sourcefilename,
    workspaceId: enriched.workspaceId,
    workspaceName: enriched.workspaceName,
    compileType,
    backend: 'modal',
  })
  const enrichedBody = {
    ...req.body,
    sourceContent: enriched.sourceContent,
    configContent: enriched.configContent,
    componentBundle: enriched.componentBundle,
    importLfr: enriched.importLfr,
    compileMode: compileType === 'lfrToMint' ? 'lfrToMint' : (req.body && req.body.compileMode),
    workspaceName: enriched.workspaceName,
  }
  delete enrichedBody.workspaceLfrBundle
  const url = NEPTUNE_COMPILE_URL.replace(/\/$/, '') + routePath
  axios.post(url, enrichedBody, { timeout: 60000, validateStatus: () => true })
    .then((axRes) => {
      if (axRes.status >= 200 && axRes.status < 300 && typeof axRes.data === 'string') {
        record.remoteJobId = axRes.data
        jobRecords.set(record.id, record)
        return res.status(axRes.status).json(record.id)
      }
      record.status = 'error'
      record.error = (axRes.data && (axRes.data.error || axRes.data.message)) || `compile HTTP ${axRes.status}`
      record.log = typeof axRes.data === 'string' ? axRes.data : JSON.stringify(axRes.data || record.error)
      record.updated_at = new Date().toISOString()
      jobRecords.set(record.id, record)
      res.status(axRes.status).json(axRes.data)
    })
    .catch((err) => {
      record.status = 'error'
      record.error = err.message || 'Neptune compute error'
      record.log = record.error
      record.updated_at = new Date().toISOString()
      jobRecords.set(record.id, record)
      res.status(502).json({ error: 'Neptune compute error', message: err.message })
    })
}

function ingestRemoteJobPayload (record, payload, session) {
  if (!record || !payload || typeof payload !== 'object') return record
  const remoteStatus = String(payload.status || '').toLowerCase()
  if (remoteStatus === 'running' || remoteStatus === 'pending' || remoteStatus === 'unknown') {
    record.status = 'running'
    return record
  }
  const outputs = payload.outputs && typeof payload.outputs === 'object' ? payload.outputs : {}
  const mintOnly = record.compileType === 'lfrToMint'
  const primaryJson = mintOnly
    ? null
    : (payload.primaryJsonName && payload.primaryJsonText
      ? { name: payload.primaryJsonName, basename: path.basename(payload.primaryJsonName), text: payload.primaryJsonText }
      : pickPrimaryPrJson(outputs))
  const result = {
    returncode: payload.returncode == null
      ? (remoteStatus === 'done' || remoteStatus === 'success' ? 0 : 1)
      : payload.returncode,
    stdout: payload.stdout || '',
    stderr: payload.stderr || '',
    log: payload.log || '',
    outputs,
    primaryJson,
    fluigiCmd: payload.fluigiCmd || [],
    error: payload.error || '',
  }
  applyCompileResult(record, result, session)
  if (payload.evaluation) {
    record.evaluation = toJobEvaluation(payload.evaluation) || record.evaluation
  }
  return record
}

async function refreshModalJob (record) {
  if (!record || record.backend !== 'modal' || record.status !== 'running') return record
  if (!NEPTUNE_COMPILE_URL || !record.remoteJobId) return record
  const base = NEPTUNE_COMPILE_URL.replace(/\/$/, '')
  try {
    const axRes = await axios.get(base + '/api/v1/job', {
      params: { id: record.remoteJobId },
      timeout: 15000,
      validateStatus: () => true,
    })
    ingestRemoteJobPayload(record, axRes.data || { status: 'unknown' }, record.session)
    if (record.status === 'done' && !record.evaluation) {
      await attachEvaluation(record)
    }
    record.updated_at = new Date().toISOString()
    jobRecords.set(record.id, record)
  } catch (_) {}
  return record
}

function resolveCompileType (req, fallback) {
  const mode = String((req.body && (req.body.compileMode || req.body.compileType)) || '').trim()
  if (mode === 'lfrToMint' || mode === 'mintOnly') return 'lfrToMint'
  return fallback
}

function proxyCompile (req, res, routePath, compileType) {
  try {
    if (NEPTUNE_COMPILE_URL) {
      return startModalCompileJob(req, res, routePath, compileType)
    }
    const jobId = startLocalCompileJob(req, compileType)
    res.json(jobId)
  } catch (err) {
    console.error('[compile] failed to start job', err)
    res.status(500).json({
      error: 'Failed to start compile job',
      message: err && err.message ? err.message : String(err),
    })
  }
}

app.post('/api/v1/fluigi', requireAuth, (req, res) => proxyCompile(req, res, '/api/v1/fluigi', 'mint'))
app.post('/api/v1/mushroommapper', requireAuth, (req, res) => {
  proxyCompile(req, res, '/api/v1/mushroommapper', resolveCompileType(req, 'lfr'))
})
// Alias kept for older clients; always hit mushroommapper so Modal/local do not 404.
app.post('/api/v1/lfrToMint', requireAuth, (req, res) => {
  if (req.body && typeof req.body === 'object') req.body.compileMode = 'lfrToMint'
  proxyCompile(req, res, '/api/v1/mushroommapper', 'lfrToMint')
})
app.get('/api/v1/jobs', requireAuth, (req, res) => {
  const ids = sessionJobs.get(sessionKey(req.session)) || []
  if (String(req.query.full || '') === '1') {
    return res.json(ids.map((id) => jobRecords.get(id)).filter(Boolean).map(publicJobRecord))
  }
  res.json(ids)
})
app.get('/api/v1/job', requireAuth, async (req, res) => {
  const jobId = String(req.query.id || req.query.jobid || '')
  const record = jobRecords.get(jobId)
  if (!record) return res.json({ status: 'unknown' })
  if (record.backend === 'modal' && record.status === 'running') {
    await refreshModalJob(record)
  }
  res.json(publicJobRecord(record))
})
app.post('/api/v1/restoreSessionJobs', requireAuth, (req, res) => {
  const jobs = req.body && Array.isArray(req.body.jobs) ? req.body.jobs : []
  const ids = restoreSessionJobs(req.session, jobs, { replace: true })
  res.json({ ok: true, restored: ids.length, ids })
})
app.delete('/api/v1/job', requireAuth, (req, res) => {
  const jobId = String((req.query && req.query.id) || (req.body && req.body.id) || '')
  const result = deleteSessionJob(req.session, jobId)
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400
    return res.status(status).json({ error: result.error || 'Failed to delete job' })
  }
  res.json(result)
})

function runCmd (cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        const err = new Error(stderr || error.message || 'Command failed')
        err.cause = error
        err.stdout = stdout
        err.stderr = stderr
        reject(err)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function parseJsonFromStdout (stdout) {
  const text = String(stdout || '').trim()
  if (!text) return null
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  if (!lines.length) return null
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i])
      if (parsed && typeof parsed === 'object') return parsed
    } catch (_) {}
  }
  return null
}

async function computeEvaluationMetricWithNeptune (designJson) {
  const pythonSnippet = [
    'import json, sys',
    'from fluigi.evaluation_metric import compute_layout_evaluation_scores',
    'metrics = compute_layout_evaluation_scores(sys.argv[1])',
    'if metrics is None:',
    '    raise SystemExit(2)',
    'print(json.dumps(metrics))',
  ].join('\n')

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neptune-eval-'))
  const tmpJsonPath = path.join(tmpDir, 'design.json')
  fs.writeFileSync(tmpJsonPath, JSON.stringify(designJson), 'utf8')

  try {
    const poetryToml = path.join(NEPTUNE_2026_ROOT, 'pyproject.toml')
    const hasPoetry = fs.existsSync(poetryToml)
    let result
    if (hasPoetry) {
      result = await runCmd('poetry', ['run', 'python', '-c', pythonSnippet, tmpJsonPath], {
        cwd: NEPTUNE_2026_ROOT,
        timeout: 60000,
      })
    } else {
      result = await runCmd('python3', ['-c', pythonSnippet, tmpJsonPath], {
        cwd: NEPTUNE_2026_ROOT,
        timeout: 60000,
        env: {
          ...process.env,
          PYTHONPATH: `${NEPTUNE_2026_ROOT}${process.env.PYTHONPATH ? `:${process.env.PYTHONPATH}` : ''}`,
        },
      })
    }
    const parsed = parseJsonFromStdout(result.stdout)
    if (!parsed) throw new Error('No JSON metrics returned from Neptune_2026 evaluation metric.')
    return parsed
  } finally {
    try { fs.unlinkSync(tmpJsonPath) } catch (_) {}
    try { fs.rmdirSync(tmpDir) } catch (_) {}
  }
}

app.post('/api/v1/evaluationMetric', requireAuth, async (req, res) => {
  const design = req.body && req.body.design
  if (!design || typeof design !== 'object') {
    return res.status(400).json({ error: 'design object required' })
  }
  try {
    const metrics = await computeEvaluationMetricWithNeptune(design)
    return res.json({ metrics })
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to compute evaluation metric'
    return res.status(500).json({ error: message })
  }
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

function findDiySourceNode (syntax, jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object') return null
  const upper = data.sanitizeComponentSyntax(syntax).toUpperCase()
  const hasParams = (n) => n && typeof n === 'object' && n.params && typeof n.params === 'object'
  const nodeKind = (n) => data.sanitizeComponentSyntax(n && (n.entity || n.macro || n.name || '')).toUpperCase()
  const matchRank = (n) => {
    if (!hasParams(n) || upper.length === 0) return 0
    const kind = nodeKind(n)
    if (kind === upper) return 2
    if (kind.startsWith(upper)) return 1
    return 0
  }
  const findBestInList = (list) => {
    if (!Array.isArray(list)) return null
    let prefixHit = null
    for (const node of list) {
      const rank = matchRank(node)
      if (rank === 2) return node
      if (rank === 1 && !prefixHit) prefixHit = node
    }
    return prefixHit
  }

  // First pass: explicit structured arrays most built-ins use.
  const componentsHit = findBestInList(jsonObj.components)
  if (componentsHit) return componentsHit
  const connectionsHit = findBestInList(jsonObj.connections)
  if (connectionsHit) return connectionsHit
  const valvesHit = findBestInList(jsonObj.valves)
  if (valvesHit) return valvesHit
  const featuresHit = findBestInList(jsonObj.features)
  if (featuresHit) return featuresHit

  // Second pass: recursive scan for structures like Valve3D that are only
  // represented as feature nodes under layers/renderLayers.
  const candidates = []
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!node || typeof node !== 'object') return
    const rank = matchRank(node)
    if (rank > 0) candidates.push({ node, rank })
    Object.keys(node).forEach((k) => {
      if (k === 'params') return
      const v = node[k]
      if (v && typeof v === 'object') visit(v)
    })
  }
  visit(jsonObj.renderLayers)
  visit(jsonObj.layers)
  visit(jsonObj.features)
  visit(jsonObj.components)
  visit(jsonObj.connections)
  if (candidates.length) {
    const exact = candidates.filter(c => c.rank === 2).map(c => c.node)
    if (exact.length) {
      const primaryExact = exact.find(n => !n.referenceID)
      return primaryExact || exact[0]
    }
    const prefix = candidates.map(c => c.node)
    // Prefer source-like nodes (not mirrors) when available.
    const primaryPrefix = prefix.find(n => !n.referenceID)
    return primaryPrefix || prefix[0]
  }

  if (Array.isArray(jsonObj.components)) {
    const hit = jsonObj.components.find(hasParams)
    if (hit) return hit
  }
  if (Array.isArray(jsonObj.valves)) {
    const hit = jsonObj.valves.find(hasParams)
    if (hit) return hit
  }
  if (Array.isArray(jsonObj.features)) {
    const hit = jsonObj.features.find(hasParams)
    if (hit) return hit
  }
  if (Array.isArray(jsonObj.connections)) {
    const hit = jsonObj.connections.find(hasParams)
    if (hit) return hit
  }
  return null
}

// Keep only DIY params that affect 3DuF geometry rendering for built-in components.
// Derived from each corresponding 3DuF component class render2D()/transformRender().
const DIY_RENDER_PARAM_ALLOWLIST = {
  channel: new Set(['channelWidth', 'crossSection']),
  mixer: new Set(['bendLength', 'bendSpacing', 'channelWidth', 'numberOfBends', 'edgeBend', 'edgeBend1', 'edgeBend2', 'rotation', 'mirrorByX', 'mirrorByY']),
  mux: new Set([
    'controlChannelWidth',
    'flowChannelWidth',
    'in',
    'length',
    'out',
    'rotation',
    'spacing',
    'stageLength',
    'width',
    'mirrorByX',
    'mirrorByY',
  ]),
  nozzle_droplet_generator: new Set([
    'oilInputWidth',
    'orificeLength',
    'orificeSize',
    'outputLength',
    'outputWidth',
    'waterInputWidth',
    'rotation',
    'mirrorByX',
    'mirrorByY',
  ]),
  picoinjector: new Set([
    'dropletWidth',
    'electrodeDistance',
    'electrodeLength',
    'electrodeWidth',
    'injectorLength',
    'injectorWidth',
    'nozzleLength',
    'nozzleWidth',
    'rotation',
    'width',
    'mirrorByX',
    'mirrorByY',
  ]),
  port: new Set(['portRadius']),
  reaction_chamber: new Set(['cornerRadius', 'length', 'rotation', 'width', 'mirrorByX', 'mirrorByY']),
  tree: new Set(['flowChannelWidth', 'in', 'out', 'rotation', 'spacing', 'stageLength', 'mirrorByX', 'mirrorByY']),
  valve3d: new Set(['gap', 'rotation', 'valveRadius']),
  valve: new Set(['length', 'rotation', 'width', 'mirrorByX', 'mirrorByY']),
}

function filterDiyParamsByRenderImpact (syntax, params) {
  const safeSyntax = data.sanitizeComponentSyntax(syntax)
  const allow = DIY_RENDER_PARAM_ALLOWLIST[safeSyntax]
  if (!allow || !params || typeof params !== 'object') return params || {}
  const next = {}
  Object.keys(params).forEach((k) => {
    if (allow.has(k)) next[k] = params[k]
  })
  return next
}

function pickEditableParams (syntax, jsonObj) {
  const src = findDiySourceNode(syntax, jsonObj)
  if (!src || !src.params) return {}
  const params = {}
  Object.keys(src.params).forEach((k) => {
    const v = src.params[k]
    if (typeof v === 'number' && Number.isFinite(v)) params[k] = v
  })
  return filterDiyParamsByRenderImpact(syntax, params)
}

// In 3DuF JSON the same primary component/connection is mirrored inside
// `renderLayers[*].features[*]` and `layers[*].features[*]` (linked by
// `referenceID === <source.id>`). DIY edits need to be applied to the source
// node AND every mirror so the rendering and hit-testing stay consistent.
function collectDiyMirrorNodes (jsonObj, sourceId) {
  if (!sourceId) return []
  const mirrors = []
  const seen = new Set()
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!node || typeof node !== 'object') return
    if (
      node.params &&
      typeof node.params === 'object' &&
      (node.referenceID === sourceId || node.id === sourceId)
    ) {
      if (seen.has(node)) return
      seen.add(node)
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

function buildMintText (syntax, params) {
  const safe = data.sanitizeComponentSyntax(syntax)
  const lines = Object.keys(params).sort().map(k => `  ${k}: ${formatScalar(params[k])};`)
  return [
    `DEVICE ${safe || 'component'}`,
    '',
    'LAYER FLOW',
    ...lines,
    'END LAYER',
    '',
  ].join('\n')
}

function stripLibraryCommentKeys (jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object' || Array.isArray(jsonObj)) return jsonObj
  const skip = new Set(['_LFR_filename', '_LFR_source', '_MINT_filename', '_MINT_source'])
  const next = {}
  Object.keys(jsonObj).forEach((k) => {
    if (!skip.has(k)) next[k] = jsonObj[k]
  })
  return next
}

function escapeRegExp (s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Rewrite `key=value` tokens in a MINT snippet to match current DIY params.
 * LFR is topology-only and is never patched this way.
 */
function applyParamsToMintText (mintText, params) {
  let out = String(mintText || '')
  if (!out.trim() || !params || typeof params !== 'object') return out
  Object.keys(params).forEach((key) => {
    const n = params[key]
    if (!Number.isFinite(n) || !key) return
    const re = new RegExp(`(\\b${escapeRegExp(key)}\\s*=\\s*)(-?\\d+(?:\\.\\d+)?)`, 'gi')
    out = out.replace(re, `$1${formatScalar(n)}`)
  })
  return out
}

function buildComponentPayload (syntax, jsonObj, source) {
  const cleaned = stripLibraryCommentKeys(jsonObj)
  const params = pickEditableParams(syntax, cleaned)
  const lfrText = data.readTextIfExists(data.getComponentDefaultLfrPath(syntax))
  const rawMint = data.readTextIfExists(data.getComponentDefaultMintPath(syntax))
  const mintText = rawMint ? applyParamsToMintText(rawMint, params) : ''
  const jsonScript = JSON.stringify(cleaned, null, 2)
  return {
    syntax: data.sanitizeComponentSyntax(syntax),
    name: data.sanitizeComponentSyntax(syntax),
    source,
    sourceType: 'default',
    showLfrMint: true,
    params,
    lfrScript: lfrText || '',
    mintScript: mintText || buildMintText(syntax, params),
    jsonScript,
    jsonViewScript: jsonScript,
  }
}

app.get('/api/v1/componentFiles', requireAuth, (req, res) => {
  res.json({ components: listComponentFilePayloads(req.session) })
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
  const parsedParams = {}
  Object.keys(rawParams).forEach((k) => {
    const n = Number(rawParams[k])
    if (Number.isFinite(n)) parsedParams[k] = n
  })
  const nextParams = filterDiyParamsByRenderImpact(syntax, parsedParams)

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

app.get('/api/v2/health', (req, res) => res.json({ ok: true }))

// Serve Vue SPA in production (dist/ is built into the container)
const DIST_DIR = path.join(__dirname, '..', 'dist')
if (require('fs').existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))
}

data.ensureDirs()
const seedResult = seedBundledDataIfNeeded(data.DATA_ROOT)
if (seedResult.seeded) {
  console.log(
    `Seeded ${seedResult.copied} bundled Data file(s) into ${data.DATA_ROOT} (${seedResult.skipped} already present)`,
  )
} else if (seedResult.reason === 'no-seed-root') {
  console.log('Startup seed skipped (no bundled seed-data; using existing Data/ tree)')
} else {
  console.log(
    `Startup seed: ${seedResult.reason} (copied=${seedResult.copied}, skipped=${seedResult.skipped})`,
  )
}

const defaultSyntaxes = data.listDefaultComponentSyntaxes()
console.log(
  `Component library defaults: ${defaultSyntaxes.length} type(s)` +
    (defaultSyntaxes.length ? ` [${defaultSyntaxes.join(', ')}]` : ' — check seed-data/ and Data/3DuF_component/default/JSON'),
)
console.log('Bundled seed root:', data.SEED_ROOT, fs.existsSync(data.SEED_ROOT) ? '(present)' : '(missing)')

app.listen(PORT, () => {
  console.log('Neptune Data server running at http://localhost:' + PORT)
  console.log('Data folder:', data.DATA_ROOT)
  console.log(
    'Compile backend:',
    NEPTUNE_COMPILE_URL
      ? `Modal ${NEPTUNE_COMPILE_URL}`
      : `local fluigi (${NEPTUNE_2026_ROOT})`,
  )
})
