/**
 * Shared helpers for the LFR naming convention used by the Component Library.
 *
 * LFR canonical form: lowercase snake_case, /^[a-z][a-z0-9_]*$/.
 * The validator accepts user-friendly input (mixed case, hyphens, spaces, CamelCase)
 * and reports both whether it is valid and the LFR-canonical form to use on save.
 *
 * See: docs/NAMING_AND_SYNTAX_SPEC_V1.md
 */

export const LFR_NAMING_SPEC_URL =
  'https://github.com/CIDARLAB/NeptuneGUI_2026/blob/main/docs/NAMING_AND_SYNTAX_SPEC_V1.md'

const LFR_CANONICAL_RE = /^[a-z][a-z0-9_]*$/
const PRE_NORMALIZE_ALLOWED_RE = /^[A-Za-z0-9_\- ]+$/

/**
 * Normalize an arbitrary user-supplied name to the LFR canonical form.
 * Hyphens / spaces become underscores, CamelCase boundaries are split,
 * everything is lowercased, and runs / leading / trailing underscores are trimmed.
 *
 * Returns an empty string if no characters survive normalization.
 *
 * @param {string} rawName
 * @returns {string}
 */
export function normalizeToLfrName (rawName) {
  return String(rawName == null ? '' : rawName)
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Validate a user-supplied name against the LFR naming convention and compute
 * the normalized form for save/import.
 *
 * @param {string} rawName
 * @returns {{ valid: true, normalized: string, needsNormalization: boolean } |
 *           { valid: false, reason: string }}
 */
export function validateAndNormalizeLfrName (rawName) {
  const trimmed = String(rawName == null ? '' : rawName).trim()
  if (!trimmed) {
    return { valid: false, reason: 'Name cannot be empty.' }
  }
  if (!PRE_NORMALIZE_ALLOWED_RE.test(trimmed)) {
    return { valid: false, reason: 'Use only letters, digits, underscores, hyphens, or spaces.' }
  }
  const normalized = normalizeToLfrName(trimmed)
  if (!LFR_CANONICAL_RE.test(normalized)) {
    return { valid: false, reason: 'Name must start with a letter and contain only letters, digits, and underscores.' }
  }
  return {
    valid: true,
    normalized,
    needsNormalization: trimmed !== normalized,
  }
}
