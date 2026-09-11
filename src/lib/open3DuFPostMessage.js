import { normalizeDeviceJsonFor3DuF } from '@/lib/normalizeDeviceJsonFor3DuF'

/** 3DuF app opened by Neptune “open in 3DuF” actions. Default is the public site; override for local 3DuF (e.g. http://localhost:8082). */
export const THREE_DUF_APP_URL = 'https://3duf.org/'

// Module-level reference to the 3DuF tab we last opened, and the timestamp at
// which that window finished navigating to the 3DuF app for the first time. We
// use this to give the caller an "instant" path (<50 ms) when the same tab
// is still open — the SPA is already mounted and its message listener is
// attached, so a single postMessage lands immediately.
let sharedWin = null
let sharedMountedAt = 0
let sharedReady = false

// IDs of every pending scheduled postMessage. When a new "open and load"
// call comes in (e.g. user clicked a second "Go to 3DuF" button), we MUST
// cancel anything scheduled for the previous JSON — otherwise a late
// cold-start retry carrying the old payload lands after the new one and
// silently reverts the canvas back to the previous design.
let pendingSendTimeouts = []
let readyListenerAttached = false

function cancelPendingSends () {
  for (const id of pendingSendTimeouts) {
    try { clearTimeout(id) } catch (_) {}
  }
  pendingSendTimeouts = []
}

function schedule (fn, ms) {
  const id = setTimeout(() => {
    // Remove self from the pending list once we actually fire. Harmless
    // if we've already been cancelled — we just don't run.
    const idx = pendingSendTimeouts.indexOf(id)
    if (idx !== -1) pendingSendTimeouts.splice(idx, 1)
    fn()
  }, ms)
  pendingSendTimeouts.push(id)
  return id
}

function isWindowAlive (w) {
  try { return !!(w && !w.closed) } catch (_) { return false }
}

function doSend (win, targetOrigin, root, label) {
  if (!isWindowAlive(win)) return
  try {
    const json = JSON.parse(JSON.stringify(root))
    win.postMessage({ type: 'loadDeviceFromJSON', json }, targetOrigin)
    console.info(`[Neptune→3DuF] posted loadDeviceFromJSON (${label})`)
  } catch (err) {
    console.warn(`[Neptune→3DuF] postMessage failed at ${label}:`, err)
  }
}

function ensureReadyListener (targetOrigin) {
  if (readyListenerAttached || typeof window === 'undefined') return
  readyListenerAttached = true
  window.addEventListener('message', (event) => {
    try {
      if (!event || !event.data || typeof event.data !== 'object') return
      if (event.data.type !== 'threeduf-ready') return
      // Accept ready from the 3DuF origin we opened (or same-origin local builds).
      if (event.origin && event.origin !== targetOrigin && !String(event.origin).includes('3duf')) {
        // Still accept if the open window is the source — local forks may use any host.
        if (!sharedWin || event.source !== sharedWin) return
      }
      sharedReady = true
      sharedMountedAt = Date.now()
      console.info('[Neptune→3DuF] received threeduf-ready')
    } catch (_) {}
  })
}

function normalizeJsonPayload (jsonTextOrObject) {
  if (jsonTextOrObject != null && typeof jsonTextOrObject === 'object') {
    return normalizeDeviceJsonFor3DuF(jsonTextOrObject)
  }
  if (typeof jsonTextOrObject === 'string') {
    try {
      return normalizeDeviceJsonFor3DuF(JSON.parse(jsonTextOrObject))
    } catch (_) {
      return null
    }
  }
  return null
}

/**
 * Legacy entry point kept for backwards compatibility. Schedules a cold-start
 * friendly send plus fallback.
 *
 * Prefer `openAndLoadDeviceIn3DuF` in new code — it handles tab reuse and is
 * much faster on subsequent clicks.
 */
export function scheduleLoadDeviceJsonPostTo3DuF (win, jsonTextOrObject, targetOrigin) {
  const root = normalizeJsonPayload(jsonTextOrObject)
  if (!root || typeof root !== 'object') {
    console.warn('[Neptune→3DuF] invalid/empty JSON payload, skipping send')
    return
  }
  // Cold-start schedule: primary at 2.5 s after SPA mount, fallback at 6.5 s.
  const delays = [2500, 6500]
  delays.forEach((ms) => {
    setTimeout(() => doSend(win, targetOrigin, root, `${ms}ms`), ms)
  })
}

/**
 * One-call helper that either reuses the already-open 3DuF tab (instant, no
 * reload) or opens a new one and schedules cold-start sends. Returns an
 * object describing what happened, so the caller can show a meaningful
 * message if the popup was blocked.
 *
 * Reuse path:
 *   - `window.open(url, 'neptune-3duf')` brings the existing named tab to
 *     focus without reloading it when the URL matches. The SPA is still
 *     mounted, so a single postMessage lands within the next tick (<50 ms
 *     round-trip). User perceives it as instantaneous.
 *
 * Cold path (first click or after user closed the tab):
 *   - Wait for `{ type: 'threeduf-ready' }` when available, with timed
 *     fallbacks so older 3DuF builds still receive the JSON.
 *
 * @param {string|object} jsonTextOrObject  device JSON to load
 * @returns {{ ok: true, reused: boolean } | { ok: false, reason: string }}
 */
export function openAndLoadDeviceIn3DuF (jsonTextOrObject) {
  const root = normalizeJsonPayload(jsonTextOrObject)
  if (!root || typeof root !== 'object') {
    return { ok: false, reason: 'invalid_json' }
  }
  const targetOrigin = new URL(THREE_DUF_APP_URL).origin
  ensureReadyListener(targetOrigin)

  const canReuse = isWindowAlive(sharedWin) && sharedMountedAt > 0 &&
    (sharedReady || (Date.now() - sharedMountedAt) >= 800)

  // Using a named target (not `_blank`) lets the browser focus the existing
  // tab instead of creating a new one every click.
  const win = window.open(THREE_DUF_APP_URL, 'neptune-3duf')
  if (!win) {
    return { ok: false, reason: 'popup_blocked' }
  }
  if (win !== sharedWin) {
    sharedWin = win
    sharedMountedAt = Date.now()
    sharedReady = false
  }
  try { win.focus() } catch (_) {}

  // Kill any retries still queued for the *previous* click. Without this,
  // a late cold-start retry (e.g. the 3 s fallback fired for design A)
  // would land after we post B and silently revert the canvas to A.
  cancelPendingSends()

  if (canReuse && sharedReady) {
    doSend(win, targetOrigin, root, 'reuse-instant')
    schedule(() => doSend(win, targetOrigin, root, 'reuse-350ms'), 350)
    return { ok: true, reused: true }
  }

  // Cold start / not-yet-ready: send on ready signal and with longer fallbacks.
  const onReady = (event) => {
    try {
      if (!event || !event.data || event.data.type !== 'threeduf-ready') return
      if (event.source && event.source !== win) return
      sharedReady = true
      sharedMountedAt = Date.now()
      doSend(win, targetOrigin, root, 'ready')
      window.removeEventListener('message', onReady)
    } catch (_) {}
  }
  window.addEventListener('message', onReady)

  const delays = [1200, 3000, 6000, 10000]
  delays.forEach((ms) => {
    schedule(() => doSend(win, targetOrigin, root, `${ms}ms`), ms)
  })
  schedule(() => {
    try { window.removeEventListener('message', onReady) } catch (_) {}
  }, 12000)

  return { ok: true, reused: false }
}
