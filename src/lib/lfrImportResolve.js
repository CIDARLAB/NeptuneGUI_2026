/**
 * Frontend LFR `` `import "..." `` resolution for compile requests.
 *
 * Path convention in the Editor: WorkspaceName/file.lfr
 * (Dashboard workspace name + LFR filename in that workspace).
 *
 * Flow: extract imports from source → look up files in local workspace index →
 * follow transitive imports → return only those files as importLfr, or list missing paths.
 */

/** Matches Neptune_2026 preprocessor: `import "....lfr" */
export const IMPORT_FILE_PATTERN = /`import\s+"([^"]+\.lfr)"/g

export function sanitizeWorkspaceImportName (name) {
  let s = String(name == null ? '' : name).trim()
  if (!s) s = 'Workspace'
  s = s.replace(/[/\\]+/g, '_').replace(/\0/g, '')
  if (s === '.' || s === '..') s = 'Workspace'
  return s
}

export function fileContentAsString (content) {
  if (content == null || content === '') return ''
  if (typeof content === 'string') return content
  try {
    return JSON.stringify(content)
  } catch (_) {
    return ''
  }
}

/**
 * Unique import specs in source order (first occurrence wins).
 * @param {string} text
 * @returns {string[]}
 */
export function extractImportSpecs (text) {
  const specs = []
  const seen = new Set()
  const src = String(text || '')
  IMPORT_FILE_PATTERN.lastIndex = 0
  let m
  while ((m = IMPORT_FILE_PATTERN.exec(src)) !== null) {
    const spec = String(m[1] || '').trim().replace(/\\/g, '/')
    if (!spec || seen.has(spec)) continue
    seen.add(spec)
    specs.push(spec)
  }
  return specs
}

/**
 * Build lookup maps from workspace file lists.
 * @param {Array<{ name?: string, files?: Array<{ name?: string, content?: any }> }>} workspaces
 * @returns {{
 *   byPath: Map<string, { path: string, workspaceName: string, fileName: string, content: string }>,
 *   byBasename: Map<string, Array<{ path: string, workspaceName: string, fileName: string, content: string }>>
 * }}
 */
export function buildWorkspaceLfrIndex (workspaces) {
  const byPath = new Map()
  const byBasename = new Map()

  const register = (entry) => {
    byPath.set(entry.path, entry)
    const safePath = `${sanitizeWorkspaceImportName(entry.workspaceName)}/${entry.fileName}`
    if (safePath !== entry.path) byPath.set(safePath, entry)
    const list = byBasename.get(entry.fileName) || []
    list.push(entry)
    byBasename.set(entry.fileName, list)
  }

  ;(workspaces || []).forEach((w) => {
    const workspaceName = String((w && w.name) || 'Workspace').trim() || 'Workspace'
    ;(w.files || []).forEach((f) => {
      const fileName = String((f && f.name) || '').trim()
      if (!/\.lfr$/i.test(fileName)) return
      const content = fileContentAsString(f && f.content)
      if (!content.trim()) return
      register({
        path: `${workspaceName}/${fileName}`,
        workspaceName,
        fileName,
        content,
      })
    })
  })

  return { byPath, byBasename }
}

/**
 * Resolve one import spec against the workspace index.
 * Prefers WorkspaceName/file.lfr; bare basename only if unique across workspaces.
 * @returns {{ path: string, workspaceName: string, fileName: string, content: string }|null}
 */
export function resolveImportSpec (spec, index) {
  const raw = String(spec || '').trim().replace(/\\/g, '/')
  if (!raw || !/\.lfr$/i.test(raw)) return null
  const { byPath, byBasename } = index || {}

  if (byPath && byPath.has(raw)) return byPath.get(raw)

  const parts = raw.split('/').filter(Boolean)
  if (parts.length >= 2) {
    const fileName = parts[parts.length - 1]
    const workspaceName = parts.slice(0, -1).join('/')
    const candidate = `${workspaceName}/${fileName}`
    if (byPath && byPath.has(candidate)) return byPath.get(candidate)
    const safe = `${sanitizeWorkspaceImportName(workspaceName)}/${fileName}`
    if (byPath && byPath.has(safe)) return byPath.get(safe)
    return null
  }

  // Bare basename: unique match only (ambiguous → missing so user fixes path)
  const hits = (byBasename && byBasename.get(parts[0])) || []
  if (hits.length === 1) return hits[0]
  return null
}

/**
 * Collect transitive importLfr from Editor source.
 * @param {string} sourceText
 * @param {{ byPath: Map, byBasename: Map }} index
 * @returns {{ ok: true, importLfr: Array<{ path: string, content: string }> } | { ok: false, missing: string[], cycle?: string[] }}
 */
export function collectImportLfr (sourceText, index) {
  const importLfr = []
  const contentByPath = new Map()
  const visiting = new Set()
  const visited = new Set()
  const missing = []
  const missingSeen = new Set()
  let cycle = null

  const visit = (spec, fromPath) => {
    if (cycle) return
    const key = String(spec || '').trim().replace(/\\/g, '/')
    if (!key) return
    if (visited.has(key)) return
    if (visiting.has(key)) {
      cycle = [...visiting, key]
      return
    }

    visiting.add(key)
    const resolved = resolveImportSpec(key, index)
    if (!resolved) {
      if (!missingSeen.has(key)) {
        missingSeen.add(key)
        missing.push(fromPath ? `${key} (imported from ${fromPath})` : key)
      }
      visiting.delete(key)
      return
    }

    const canon = resolved.path
    if (!contentByPath.has(canon)) {
      contentByPath.set(canon, resolved.content)
      importLfr.push({ path: canon, content: resolved.content })
    }

    extractImportSpecs(resolved.content).forEach((nested) => visit(nested, canon))
    visiting.delete(key)
    visited.add(key)
    visited.add(canon)
  }

  extractImportSpecs(sourceText).forEach((spec) => visit(spec, null))

  if (cycle) {
    return { ok: false, missing: [], cycle }
  }
  if (missing.length) {
    return { ok: false, missing }
  }
  return { ok: true, importLfr }
}

/**
 * Human-readable error for missing / circular imports.
 */
export function formatImportResolveError (result) {
  if (!result || result.ok) return ''
  if (result.cycle && result.cycle.length) {
    return (
      'Circular LFR import detected:\n' +
      result.cycle.join(' → ') +
      '\n\nPlease fix the import cycle and try again.'
    )
  }
  const list = (result.missing || []).map((m) => `  - ${m}`).join('\n')
  return (
    'Could not find LFR file(s) referenced by `import:\n' +
    list +
    '\n\nUse WorkspaceName/file.lfr (exact Dashboard workspace name + filename) and check spelling.'
  )
}
