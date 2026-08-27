/**
 * Example workspace seed: only flow_only_demo and flow_and_control_demo.
 * Sources and PR JSON come from Microfluidics-Benchmarks via Data/example/.
 */
import flowOnlyLfr from '!!raw-loader!../../Data/example/flow_only_demo/flow_only_demo.lfr'
import flowOnlyMint from '!!raw-loader!../../Data/example/flow_only_demo/flow_only_demo.mint'
import flowOnlyFromLfrMint from '!!raw-loader!../../Data/example/flow_only_demo/flow_only_demo_fromLFR.mint'
import flowOnlyPrJson from '../../Data/example/flow_only_demo/flow_only_demo_fromLFR_PR.json'
import flowOnlyFromMintPrJson from '../../Data/example/flow_only_demo/flow_only_demo_fromMINT_PR.json'
import flowControlLfr from '!!raw-loader!../../Data/example/flow_and_control_demo/flow_and_control_demo.lfr'
import flowControlMint from '!!raw-loader!../../Data/example/flow_and_control_demo/flow_and_control_demo.mint'
import flowControlFromLfrMint from '!!raw-loader!../../Data/example/flow_and_control_demo/flow_and_control_demo_fromLFR.mint'
import flowControlFromLfrPrJson from '../../Data/example/flow_and_control_demo/flow_and_control_demo_fromLFR_PR.json'
import flowControlFromMintPrJson from '../../Data/example/flow_and_control_demo/flow_and_control_demo_fromMINT_PR.json'

function raw (m) {
  if (m == null) return ''
  if (typeof m === 'string') return m
  const d = m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, 'default')
    ? m.default
    : m
  if (typeof d === 'string') return d
  if (typeof d === 'object' && d !== null) return JSON.stringify(d)
  return String(m)
}

export const EXAMPLE_SEED_SPECS = [
  { name: 'flow_only_demo.lfr', ext: '.lfr', content: raw(flowOnlyLfr) },
  { name: 'flow_only_demo.mint', ext: '.mint', content: raw(flowOnlyMint) },
  { name: 'flow_only_demo_fromLFR.mint', ext: '.mint', content: raw(flowOnlyFromLfrMint) },
  { name: 'flow_only_demo_fromLFR_PR.json', ext: '.json', content: raw(flowOnlyPrJson) },
  { name: 'flow_only_demo_fromMINT_PR.json', ext: '.json', content: raw(flowOnlyFromMintPrJson) },
  { name: 'flow_and_control_demo.lfr', ext: '.lfr', content: raw(flowControlLfr) },
  { name: 'flow_and_control_demo.mint', ext: '.mint', content: raw(flowControlMint) },
  { name: 'flow_and_control_demo_fromLFR.mint', ext: '.mint', content: raw(flowControlFromLfrMint) },
  { name: 'flow_and_control_demo_fromLFR_PR.json', ext: '.json', content: raw(flowControlFromLfrPrJson) },
  { name: 'flow_and_control_demo_fromMINT_PR.json', ext: '.json', content: raw(flowControlFromMintPrJson) },
]
