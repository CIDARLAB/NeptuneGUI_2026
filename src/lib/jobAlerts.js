export function normalizeJobResultStatus (job) {
  const raw = String(
    (job && (job.status || job.state || job.job_status || job.result_status)) || ''
  ).toLowerCase()
  if (/fail|error/.test(raw)) return 'fail'
  if (/ongoing|running|pending|progress|processing|unknown/.test(raw)) return 'processing'
  if (/done|success|completed|complete/.test(raw)) return 'done'
  if (job && (job.jsonText || job.evaluation)) return 'done'
  return 'processing'
}

export function buildJobAlertRecord (job, status) {
  const st = status || normalizeJobResultStatus(job)
  const input = (job && (job.sourceFilename || job.inputFile)) || 'design'
  const output = (job && job.outputFileName) || ''
  const workspaceName = (job && job.workspaceName) || ''
  const ok = st === 'done'
  const wsSuffix = workspaceName ? ` · ${workspaceName}` : ''
  return {
    id: String(job && job.id),
    jobId: job && job.id,
    status: st,
    read: false,
    createdAt: Date.now(),
    title: ok ? 'Compile finished' : 'Compile failed',
    text: ok
      ? `${input} compiled successfully${output ? ` → ${output}` : ''}${wsSuffix}`
      : `${input} compile failed${wsSuffix}. Open Jobs to view the log.`,
    inputFile: input,
    outputFile: output,
    workspaceName,
  }
}
