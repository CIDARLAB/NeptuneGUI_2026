/**
 * Classify compile artifacts so Dashboard workspaces only show user-facing
 * files (sources, MINT, PR JSON). Logs and evaluation stay on the job and
 * in the backup zip; unplaced JSON is discarded.
 */

export function compileArtifactKind (fileName) {
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

export function isPrJsonFileName (fileName) {
  return compileArtifactKind(fileName) === 'prJson'
}

export function isWorkspaceVisibleFileName (fileName) {
  const kind = compileArtifactKind(fileName)
  return kind !== 'log' && kind !== 'evaluation' && kind !== 'intermediateJson'
}

export function isZipCompileSidecar (fileName) {
  const kind = compileArtifactKind(fileName)
  return kind === 'log' || kind === 'evaluation'
}

export function shouldKeepCompileGeneratedFile (fileName) {
  const kind = compileArtifactKind(fileName)
  return kind === 'prJson' || kind === 'mint' || kind === 'log' || kind === 'evaluation'
}

export function filterWorkspaceVisibleFiles (files) {
  return (files || []).filter((f) => f && isWorkspaceVisibleFileName(f.name))
}

export function evaluationFileNameFromPr (outputFileName, stamp) {
  const base = String(outputFileName || 'design').replace(/\.json$/i, '')
  const m = base.match(/^(.*)\((\d{12})\)$/)
  if (m) return `${m[1]}_evaluation(${m[2]}).json`
  return `${base}_evaluation(${stamp || '000000000000'}).json`
}

export function zipSidecarFilesFromJob (job) {
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
    add({
      name: evaluationFileNameFromPr(job.outputFileName, stampMatch ? stampMatch[1] : ''),
      content: JSON.stringify(job.evaluation, null, 2),
    })
  }
  return extras
}
