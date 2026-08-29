/**
 * Classify compile artifacts so Dashboard workspaces only show user-facing
 * files (sources, MINT, PR JSON). Logs and evaluation stay on the job and
 * in the backup zip; unplaced JSON is discarded.
 */

function compileArtifactKind (fileName) {
  const base = String(fileName || '').split(/[/\\]/).pop() || ''
  if (!base) return 'other'
  if (/\.log$/i.test(base)) return 'log'
  if (/evaluation/i.test(base) && /\.json$/i.test(base)) return 'evaluation'
  if (/\.json$/i.test(base)) {
    if (/_from(lfr|mint)_pr(?:\(\d{12}\))?\.json$/i.test(base)) return 'prJson'
    if (/_pr(?:\(\d{12}\))?\.json$/i.test(base)) return 'prJson'
    if (/_from(lfr|mint)(?:\(\d{12}\))?\.json$/i.test(base)) return 'intermediateJson'
    return 'json'
  }
  if (/\.mint$/i.test(base)) return 'mint'
  if (/\.lfr$/i.test(base)) return 'lfr'
  return 'other'
}

function isPrJsonFileName (fileName) {
  return compileArtifactKind(fileName) === 'prJson'
}

function isWorkspaceVisibleFileName (fileName) {
  const kind = compileArtifactKind(fileName)
  return kind !== 'log' && kind !== 'evaluation' && kind !== 'intermediateJson'
}

function isZipCompileSidecar (fileName) {
  const kind = compileArtifactKind(fileName)
  return kind === 'log' || kind === 'evaluation'
}

function shouldKeepCompileGeneratedFile (fileName) {
  const kind = compileArtifactKind(fileName)
  return kind === 'prJson' || kind === 'mint' || kind === 'log' || kind === 'evaluation'
}

module.exports = {
  compileArtifactKind,
  isPrJsonFileName,
  isWorkspaceVisibleFileName,
  isZipCompileSidecar,
  shouldKeepCompileGeneratedFile,
}
