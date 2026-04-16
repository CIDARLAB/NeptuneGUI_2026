/**
 * Build Example workspace seed list from Data/example at compile time.
 * This avoids hardcoding file names in code.
 */
import { EXAMPLE_LFR_SCRIPT, EXAMPLE_MINT_SCRIPT } from './exampleScripts'
import { EXAMPLE_DX_SEED_SPECS } from './exampleDxSeed'

const EXAMPLE_TEXT_FILE_REGEX = /\.(lfr|mint|json|dot|txt|md|cfg|ini|uf|v)$/i
let rawExampleContext = null
try {
  rawExampleContext = require.context(
    '!!raw-loader!../../Data/example',
    true,
    EXAMPLE_TEXT_FILE_REGEX
  )
} catch (_) {}

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

function extFromName (name) {
  const m = String(name || '').match(/\.[^.]+$/)
  return m ? m[0].toLowerCase() : ''
}

function basenameFromContextKey (key) {
  const normalized = String(key || '').replace(/^\.\//, '')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

function buildFromContext () {
  if (!rawExampleContext) return []
  const byName = new Map()
  rawExampleContext.keys().sort((a, b) => a.localeCompare(b)).forEach((key) => {
    const name = basenameFromContextKey(key)
    if (!name || byName.has(name)) return
    const content = raw(rawExampleContext(key))
    byName.set(name, {
      name,
      ext: extFromName(name),
      content,
    })
  })
  return Array.from(byName.values())
}

function buildFallbackSpecs () {
  return [
    { name: 'flow_and_control_demo.lfr', ext: '.lfr', content: EXAMPLE_LFR_SCRIPT },
    { name: 'flow_and_control_demo.mint', ext: '.mint', content: EXAMPLE_MINT_SCRIPT },
    ...EXAMPLE_DX_SEED_SPECS,
  ]
}

const scanned = buildFromContext()
export const EXAMPLE_SEED_SPECS = scanned.length > 0 ? scanned : buildFallbackSpecs()

