/**
 * Data/example/dx — bundled at compile time for guest Example workspace (same files on disk).
 */
import dx2Lfr from '!!raw-loader!../../Data/example/dx/dx2.lfr'
import dx2Mint from '!!raw-loader!../../Data/example/dx/dx2.mint'
import dx2Json from '../../Data/example/dx/dx2_after_PR.json'
import dx3Lfr from '!!raw-loader!../../Data/example/dx/dx3.lfr'
import dx3Mint from '!!raw-loader!../../Data/example/dx/dx3.mint'
import dx3Json from '../../Data/example/dx/dx3_after_PR.json'

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

export const EXAMPLE_DX_SEED_SPECS = [
  { name: 'dx2.lfr', ext: '.lfr', content: raw(dx2Lfr) },
  { name: 'dx2.mint', ext: '.mint', content: raw(dx2Mint) },
  { name: 'dx2_after_PR.json', ext: '.json', content: raw(dx2Json) },
  { name: 'dx3.lfr', ext: '.lfr', content: raw(dx3Lfr) },
  { name: 'dx3.mint', ext: '.mint', content: raw(dx3Mint) },
  { name: 'dx3_after_PR.json', ext: '.json', content: raw(dx3Json) },
]

