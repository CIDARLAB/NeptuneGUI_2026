/**
 * Default Editor scripts (same content as Data/example/flow_and_control_demo/).
 * Bundled so guest mode does not depend on /api/v1/exampleScript.
 */
import lfr from '!!raw-loader!../../Data/example/flow_and_control_demo/flow_and_control_demo.lfr'
import mint from '!!raw-loader!../../Data/example/flow_and_control_demo/flow_and_control_demo.mint'

function raw (m) {
  if (m == null) return ''
  if (typeof m === 'string') return m
  const d = m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, 'default')
    ? m.default
    : m
  return typeof d === 'string' ? d : String(d || '')
}

export const EXAMPLE_LFR_SCRIPT = raw(lfr)
export const EXAMPLE_MINT_SCRIPT = raw(mint)
