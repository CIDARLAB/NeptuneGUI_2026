/**
 * Helpers for bundling Component Library state into compile requests,
 * plus workspace LFR trees for Editor `` `import "Workspace/file.lfr" ``.
 */

function sanitizeSyntax (syntax) {
  return String(syntax || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

/**
 * Workspace folder segment for import paths. Preserves the display name while
 * blocking path separators / traversal so `` `import "My Workspace/foo.lfr" ``
 * maps to a single directory under the compile --pre-load root.
 */
function sanitizeWorkspaceImportName (name) {
  let s = String(name == null ? '' : name).trim()
  if (!s) s = 'Workspace'
  s = s.replace(/[/\\]+/g, '_').replace(/\0/g, '')
  if (s === '.' || s === '..') s = 'Workspace'
  return s
}

/**
 * Basename-only .lfr filename for import staging.
 */
function sanitizeLfrFileName (name) {
  const base = String(name == null ? '' : name).trim().split(/[/\\]/).pop() || ''
  if (!base || base === '.' || base === '..') return ''
  if (!/\.lfr$/i.test(base)) return ''
  return base
}

/**
 * Merge client snapshot (from UI) over server list; client wins per syntax.
 * @param {Array<object>} serverList
 * @param {Array<object>|null|undefined} clientList
 */
function mergeComponentBundles (serverList, clientList) {
  if (!Array.isArray(clientList) || clientList.length === 0) return serverList || []
  const bySyntax = new Map()
  ;(serverList || []).forEach((item) => {
    const syntax = sanitizeSyntax(item && item.syntax)
    if (syntax) bySyntax.set(syntax, item)
  })
  clientList.forEach((item) => {
    const syntax = sanitizeSyntax(item && item.syntax)
    if (!syntax) return
    bySyntax.set(syntax, { ...(bySyntax.get(syntax) || {}), ...item, syntax })
  })
  return [...bySyntax.values()]
}

/**
 * Slim payload forwarded to Modal / fluigi (JSON + LFR/MINT per component).
 * Keep LFR-only rows so fluigi --pre-load can resolve module imports from the library.
 * @param {Array<object>} components
 */
function toCompileComponentBundle (components) {
  return (components || []).map((item) => ({
    syntax: sanitizeSyntax(item.syntax),
    name: String(item.name || item.syntax || '').trim() || sanitizeSyntax(item.syntax),
    source: item.source || 'unknown',
    sourceType: item.sourceType || null,
    params: item.params && typeof item.params === 'object' ? item.params : {},
    jsonScript: String(item.jsonScript || ''),
    lfrScript: String(item.lfrScript || ''),
    mintScript: String(item.mintScript || ''),
  })).filter(item => item.syntax && (item.jsonScript || item.lfrScript))
}

/**
 * Normalize a workspace-LFR import tree for the compile backend.
 * Each entry becomes workspaceName/fileName under --pre-load.
 * @param {Array<object>|null|undefined} list
 */
function normalizeWorkspaceLfrBundle (list) {
  if (!Array.isArray(list) || list.length === 0) return []
  const out = []
  list.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const workspaceName = sanitizeWorkspaceImportName(
      item.workspaceName || item.workspace || item.workspace_name
    )
    const fileName = sanitizeLfrFileName(item.fileName || item.name || item.filename)
    if (!fileName) return
    let content = item.content != null ? item.content : (item.lfrScript || item.lfr_script || '')
    if (content != null && typeof content !== 'string') {
      try { content = JSON.stringify(content) } catch (_) { content = '' }
    }
    content = String(content || '')
    if (!content.trim()) return
    out.push({ workspaceName, fileName, content })
  })
  return out
}

/**
 * Normalize client importLfr payload: only files explicitly referenced by `` `import ``.
 * @param {Array<object>|null|undefined} list
 * @returns {Array<{ path: string, content: string, workspaceName: string, fileName: string }>}
 */
function normalizeImportLfr (list) {
  if (!Array.isArray(list) || list.length === 0) return []
  const out = []
  const seen = new Set()
  list.forEach((item) => {
    if (!item || typeof item !== 'object') return
    let pathSpec = String(item.path || item.importPath || '').trim().replace(/\\/g, '/')
    let workspaceName = item.workspaceName || item.workspace || item.workspace_name
    let fileName = item.fileName || item.name || item.filename
    if (pathSpec) {
      const parts = pathSpec.split('/').filter(Boolean)
      if (parts.length >= 2) {
        fileName = parts[parts.length - 1]
        workspaceName = parts.slice(0, -1).join('/')
      } else if (parts.length === 1) {
        fileName = parts[0]
      }
    }
    workspaceName = sanitizeWorkspaceImportName(workspaceName)
    fileName = sanitizeLfrFileName(fileName)
    if (!fileName) return
    const pathKey = `${workspaceName}/${fileName}`
    if (seen.has(pathKey)) return
    let content = item.content != null ? item.content : (item.lfrScript || item.lfr_script || '')
    if (content != null && typeof content !== 'string') {
      try { content = JSON.stringify(content) } catch (_) { content = '' }
    }
    content = String(content || '')
    if (!content.trim()) return
    seen.add(pathKey)
    out.push({ path: pathKey, workspaceName, fileName, content })
  })
  return out
}

module.exports = {
  mergeComponentBundles,
  toCompileComponentBundle,
  normalizeWorkspaceLfrBundle,
  normalizeImportLfr,
  sanitizeWorkspaceImportName,
  sanitizeLfrFileName,
}
