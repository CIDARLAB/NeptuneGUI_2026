/**
 * Local fluigi compile runner.
 * Mirrors modal_app.py: write source + component/import bundles, then
 * `fluigi synthesize` (LFR) or `fluigi synthesizeFromMINT` (MINT).
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const LOG_CAP = 400000

function sanitizeSyntax (syntax) {
  return String(syntax || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

function sanitizeWorkspaceImportName (name) {
  let s = String(name == null ? '' : name).trim()
  if (!s) s = 'Workspace'
  s = s.replace(/[/\\]+/g, '_').replace(/\0/g, '')
  if (s === '.' || s === '..') s = 'Workspace'
  return s
}

function sanitizeLfrFileName (name) {
  const base = path.basename(String(name == null ? '' : name).trim())
  if (!base || base === '.' || base === '..') return ''
  if (!/\.lfr$/i.test(base)) return ''
  return base
}

function sanitizeSourceFilename (name, compileType) {
  const fallback = compileType === 'lfr' ? 'input.lfr' : 'input.mint'
  const base = path.basename(String(name || '').trim()) || fallback
  if (base === '.' || base === '..') return fallback
  return base.replace(/[^\w.\-]+/g, '_')
}

function writeComponentBundle (tmpdir, bundle) {
  if (!Array.isArray(bundle) || bundle.length === 0) return null

  const root = path.join(tmpdir, '3DuF_component', 'default')
  const jsonDir = path.join(root, 'JSON')
  const lfrDir = path.join(root, 'LFR')
  const mintDir = path.join(root, 'MINT')
  fs.mkdirSync(jsonDir, { recursive: true })
  fs.mkdirSync(lfrDir, { recursive: true })
  fs.mkdirSync(mintDir, { recursive: true })

  let jsonCount = 0
  let lfrCount = 0
  let mintCount = 0
  for (const item of bundle) {
    if (!item || typeof item !== 'object') continue
    const syntax = sanitizeSyntax(item.syntax || item.name)
    if (!syntax) continue

    const jsonScript = item.jsonScript || item.json_script || ''
    if (String(jsonScript).trim()) {
      fs.writeFileSync(path.join(jsonDir, `${syntax}.json`), String(jsonScript), 'utf8')
      jsonCount += 1
    }
    const lfrScript = item.lfrScript || item.lfr_script || ''
    if (String(lfrScript).trim()) {
      fs.writeFileSync(path.join(lfrDir, `${syntax}.lfr`), String(lfrScript), 'utf8')
      lfrCount += 1
    }
    const mintScript = item.mintScript || item.mint_script || ''
    if (String(mintScript).trim()) {
      fs.writeFileSync(path.join(mintDir, `${syntax}.mint`), String(mintScript), 'utf8')
      mintCount += 1
    }
  }

  if (jsonCount === 0 && lfrCount === 0) return null
  return { root, jsonDir, lfrDir, mintDir, jsonCount, lfrCount, mintCount }
}

function writeImportLfrTree (tmpdir, bundle) {
  if (!Array.isArray(bundle) || bundle.length === 0) return null
  const root = path.join(tmpdir, 'import_lfr')
  let count = 0
  for (const item of bundle) {
    if (!item || typeof item !== 'object') continue
    let pathSpec = String(item.path || item.importPath || '').trim().replace(/\\/g, '/')
    let ws = item.workspaceName || item.workspace || item.workspace_name
    let fname = item.fileName || item.name || item.filename
    if (pathSpec) {
      const parts = pathSpec.split('/').filter(Boolean)
      if (parts.length >= 2) {
        fname = parts[parts.length - 1]
        ws = parts.slice(0, -1).join('/')
      } else if (parts.length === 1) {
        fname = parts[0]
      }
    }
    ws = sanitizeWorkspaceImportName(ws)
    fname = sanitizeLfrFileName(fname)
    if (!fname) continue
    let content = item.content != null ? item.content : (item.lfrScript || item.lfr_script || '')
    if (content != null && typeof content !== 'string') {
      try { content = JSON.stringify(content) } catch (_) { content = '' }
    }
    content = String(content || '')
    if (!content.trim()) continue
    const destDir = path.join(root, ws)
    fs.mkdirSync(destDir, { recursive: true })
    fs.writeFileSync(path.join(destDir, fname), content, 'utf8')
    count += 1
  }
  if (count === 0) return null
  return { root, count }
}

function buildFluigiCmd (compileType, srcPath, outputDir, componentPaths) {
  const args = compileType === 'lfr'
    ? ['synthesize', '-o', outputDir, srcPath]
    : ['synthesizeFromMINT', '-o', outputDir, srcPath]

  if (!componentPaths) return args

  if (componentPaths.jsonCount) {
    args.push('--component-library', componentPaths.jsonDir)
  }
  if (compileType === 'lfr' && componentPaths.lfrCount) {
    args.push('--pre-load', componentPaths.lfrDir)
  }
  if (compileType === 'lfr' && componentPaths.importLfrRoot) {
    args.push('--pre-load', componentPaths.importLfrRoot)
  }
  return args
}

function resolveFluigiInvocation (neptuneRoot) {
  const poetryToml = path.join(neptuneRoot, 'pyproject.toml')
  if (fs.existsSync(poetryToml)) {
    return { cmd: 'poetry', argsPrefix: ['run', 'fluigi'] }
  }
  return { cmd: 'fluigi', argsPrefix: [] }
}

function capText (text, max) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(s.length - max)
}

function collectOutputFiles (outputDir) {
  const outputs = {}
  const textExt = new Set(['.json', '.log', '.mint', '.txt', '.csv', '.dot', '.lfr'])
  if (!fs.existsSync(outputDir)) return outputs
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.isFile()) continue
      if (!textExt.has(path.extname(entry.name).toLowerCase())) continue
      try {
        outputs[path.relative(outputDir, full)] = fs.readFileSync(full, 'utf8')
      } catch (_) {}
    }
  }
  walk(outputDir)
  return outputs
}

function pickPrimaryPrJson (outputs) {
  const names = Object.keys(outputs || {})
  const ranked = []
  for (const name of names) {
    const base = path.basename(name)
    if (base === 'component_library.json') continue
    if (/_from(LFR|MINT)_PR\.json$/i.test(base)) ranked.push([0, name])
    else if (/_PR\.json$/i.test(base)) ranked.push([1, name])
    else if (/\.json$/i.test(base)) ranked.push([2, name])
  }
  if (!ranked.length) return null
  ranked.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]))
  const name = ranked[0][1]
  return { name, basename: path.basename(name), text: outputs[name] }
}

function collectLogText (outputs, stdout, stderr, extraError) {
  const parts = []
  const logNames = Object.keys(outputs || {}).filter((n) => /\.log$/i.test(n)).sort()
  for (const name of logNames) {
    const body = String(outputs[name] || '').trim()
    if (body) parts.push(`--- ${path.basename(name)} ---\n${body}`)
  }
  const std = String(stdout || '').trim()
  const err = String(stderr || '').trim()
  if (std) parts.push(std)
  if (err) parts.push(err)
  if (extraError) parts.push(String(extraError))
  return capText(parts.join('\n\n'), LOG_CAP)
}

function runProcess (cmd, args, options) {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM') } catch (_) {}
      setTimeout(() => {
        try { child.kill('SIGKILL') } catch (_) {}
      }, 5000)
      if (!settled) {
        settled = true
        resolve({
          returncode: -1,
          stdout,
          stderr,
          error: `compile timed out after ${Math.round((options.timeoutMs || 3500000) / 1000)}s`,
        })
      }
    }, options.timeoutMs || 3500000)

    child.stdout.on('data', (buf) => { stdout += buf.toString() })
    child.stderr.on('data', (buf) => { stderr += buf.toString() })
    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        returncode: -1,
        stdout,
        stderr,
        error: err && err.message ? err.message : String(err),
      })
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        returncode: code == null ? -1 : code,
        stdout,
        stderr,
        error: null,
      })
    })
  })
}

/**
 * Run one local fluigi compile job.
 * @returns {Promise<{
 *   returncode: number,
 *   stdout: string,
 *   stderr: string,
 *   log: string,
 *   outputs: Record<string, string>,
 *   primaryJson: { name: string, basename: string, text: string } | null,
 *   fluigiCmd: string[],
 *   error: string | null,
 *   componentJsonCount: number,
 *   componentLfrCount: number,
 *   importLfrCount: number,
 * }>}
 */
async function runLocalCompile ({
  neptuneRoot,
  compileType,
  sourceContent,
  sourceFilename,
  configContent,
  configFilename,
  componentBundle,
  importLfr,
  timeoutMs,
}) {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'neptune-compile-'))
  try {
    const outputDir = path.join(tmpdir, 'output')
    fs.mkdirSync(outputDir, { recursive: true })

    const srcName = sanitizeSourceFilename(sourceFilename, compileType)
    const srcPath = path.join(tmpdir, srcName)
    fs.writeFileSync(srcPath, String(sourceContent || ''), 'utf8')

    if (configContent && configFilename) {
      const cfgName = path.basename(String(configFilename))
      if (cfgName && cfgName !== '.' && cfgName !== '..') {
        fs.writeFileSync(path.join(tmpdir, cfgName), String(configContent), 'utf8')
      }
    }

    const componentPaths = writeComponentBundle(tmpdir, componentBundle || []) || {
      jsonCount: 0,
      lfrCount: 0,
      mintCount: 0,
    }
    const importMeta = writeImportLfrTree(tmpdir, importLfr || [])
    if (importMeta) componentPaths.importLfrRoot = importMeta.root

    const fluigiArgs = buildFluigiCmd(compileType, srcPath, outputDir, componentPaths)
    const invocation = resolveFluigiInvocation(neptuneRoot)
    const cmd = invocation.cmd
    const args = [...invocation.argsPrefix, ...fluigiArgs]
    const fluigiCmd = [cmd, ...args]

    if (!fs.existsSync(neptuneRoot)) {
      const error = `Neptune_2026 not found at ${neptuneRoot}. Set NEPTUNE_2026_ROOT or clone it next to NeptuneGUI_2026.`
      return {
        returncode: -1,
        stdout: '',
        stderr: error,
        log: error,
        outputs: {},
        primaryJson: null,
        fluigiCmd,
        error,
        componentJsonCount: componentPaths.jsonCount || 0,
        componentLfrCount: componentPaths.lfrCount || 0,
        importLfrCount: importMeta ? importMeta.count : 0,
      }
    }

    const result = await runProcess(cmd, args, {
      cwd: neptuneRoot,
      timeoutMs: timeoutMs || 3500000,
      env: process.env,
    })
    const outputs = collectOutputFiles(outputDir)
    const primaryJson = pickPrimaryPrJson(outputs)
    const log = collectLogText(outputs, result.stdout, result.stderr, result.error)
    return {
      returncode: result.returncode,
      stdout: capText(result.stdout, 20000),
      stderr: capText(result.stderr, 8000),
      log,
      outputs,
      primaryJson,
      fluigiCmd,
      error: result.error,
      componentJsonCount: componentPaths.jsonCount || 0,
      componentLfrCount: componentPaths.lfrCount || 0,
      importLfrCount: importMeta ? importMeta.count : 0,
    }
  } finally {
    try { fs.rmSync(tmpdir, { recursive: true, force: true }) } catch (_) {}
  }
}

function logFileNameFor (sourceFilename, compileType) {
  const stem = String(sourceFilename || 'design').replace(/\.[^.]+$/, '') || 'design'
  const suffix = compileType === 'lfr' ? '_fromLFR.log' : '_fromMINT.log'
  return `${path.basename(stem)}${suffix}`
}

module.exports = {
  runLocalCompile,
  pickPrimaryPrJson,
  collectLogText,
  logFileNameFor,
  capText,
}
