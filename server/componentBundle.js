/**
 * Helpers for bundling Component Library state into compile requests.
 */

function sanitizeSyntax (syntax) {
  return String(syntax || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
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
  })).filter(item => item.syntax && item.jsonScript)
}

module.exports = {
  mergeComponentBundles,
  toCompileComponentBundle,
}
