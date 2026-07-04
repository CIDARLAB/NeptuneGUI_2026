/**
 * Copy bundled read-only defaults into the runtime Data/ volume when files are missing.
 * Used in production (Fly/ECS) where /app/Data is a persistent mount and git-tracked
 * defaults are not present on first boot.
 */

const fs = require('fs')
const path = require('path')

const SEED_ROOT = process.env.NEPTUNE_SEED_DATA_ROOT || path.join(__dirname, '..', 'seed-data')

/** Relative paths under Data/ that may be seeded (never touches Temp/, Users/, or tmp/). */
const SEED_TARGETS = [
  '3DuF_component/default',
  'example',
]

function ensureDir (dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

/**
 * Recursively copy files from src to dest. Existing dest files are left unchanged.
 * @returns {{ copied: number, skipped: number }}
 */
function copyTreeMerge (srcRoot, destRoot) {
  let copied = 0
  let skipped = 0
  if (!fs.existsSync(srcRoot)) return { copied, skipped }

  const walk = (rel) => {
    const srcPath = path.join(srcRoot, rel)
    const destPath = path.join(destRoot, rel)
    const stat = fs.statSync(srcPath)
    if (stat.isDirectory()) {
      ensureDir(destPath)
      for (const name of fs.readdirSync(srcPath)) {
        walk(rel ? path.join(rel, name) : name)
      }
      return
    }
    if (fs.existsSync(destPath)) {
      skipped += 1
      return
    }
    ensureDir(path.dirname(destPath))
    fs.copyFileSync(srcPath, destPath)
    copied += 1
  }

  walk('')
  return { copied, skipped }
}

/**
 * @param {string} dataRoot Absolute path to runtime Data/ (mounted volume in prod).
 */
function seedBundledDataIfNeeded (dataRoot) {
  if (!fs.existsSync(SEED_ROOT)) {
    return { seeded: false, reason: 'no-seed-root', copied: 0, skipped: 0 }
  }

  let copied = 0
  let skipped = 0
  for (const rel of SEED_TARGETS) {
    const result = copyTreeMerge(
      path.join(SEED_ROOT, rel),
      path.join(dataRoot, rel),
    )
    copied += result.copied
    skipped += result.skipped
  }

  return {
    seeded: copied > 0,
    reason: copied > 0 ? 'merged-missing-files' : 'already-present',
    copied,
    skipped,
  }
}

module.exports = {
  SEED_ROOT,
  seedBundledDataIfNeeded,
}
