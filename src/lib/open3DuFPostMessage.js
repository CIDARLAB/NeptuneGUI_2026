import { normalizeDeviceJsonFor3DuF } from '@/lib/normalizeDeviceJsonFor3DuF'

/** 3DuF app opened by Neptune “open in 3DuF” actions. Default is the public site; override for local 3DuF (e.g. http://localhost:8082). */
export const THREE_DUF_APP_URL = 'https://3duf.org/'

// Module-level reference to the 3DuF tab we last opened, and the timestamp at
// which that window finished navigating to the 3DuF app for the first time.
let sharedWin = null
let sharedMountedAt = 0
let sharedReady = false
let loadGeneration = 0

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

function isTrusted3DuFSource (event, targetOrigin) {
  if (event.origin && event.origin !== targetOrigin && !String(event.origin).includes('3duf')) {
    if (!sharedWin || event.source !== sharedWin) return false
  }
  return true
}

function ensureReadyListener (targetOrigin) {
  if (readyListenerAttached || typeof window === 'undefined') return
  readyListenerAttached = true
  window.addEventListener('message', (event) => {
    try {
      if (!event || !event.data || typeof event.data !== 'object') return
      if (!isTrusted3DuFSource(event, targetOrigin)) return
      if (event.data.type === 'threeduf-device-loaded') {
        cancelPendingSends()
        sharedReady = true
        sharedMountedAt = Date.now()
        return
      }
      if (event.data.type !== 'threeduf-ready') return
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

function forceCleanReload (win) {
  if (!isWindowAlive(win)) return
  try {
    const target = new URL(THREE_DUF_APP_URL)
    let current = null
    try { current = new URL(win.location.href) } catch (_) {}
    const sameApp = current &&
      current.origin === target.origin &&
      current.pathname.replace(/\/$/, '') === target.pathname.replace(/\/$/, '')
    if (sameApp) {
      // Keep the address bar as https://3duf.org/ — never add query flags.
      if (current.search || current.hash) {
        win.location.replace(target.toString())
      } else {
        win.location.reload()
      }
    } else {
      win.location.replace(target.toString())
    }
  } catch (_) {
    try { win.location.reload() } catch (__) {}
  }
}

/**
 * Legacy entry point kept for backwards compatibility. Schedules a cold-start
 * friendly send plus fallback.
 *
 * Prefer `openAndLoadDeviceIn3DuF` in new code.
 */
export function scheduleLoadDeviceJsonPostTo3DuF (win, jsonTextOrObject, targetOrigin) {
  const root = normalizeJsonPayload(jsonTextOrObject)
  if (!root || typeof root !== 'object') {
    console.warn('[Neptune→3DuF] invalid/empty JSON payload, skipping send')
    return
  }
  const delays = [2000, 3500]
  delays.forEach((ms) => {
    setTimeout(() => doSend(win, targetOrigin, root, `${ms}ms`), ms)
  })
}

function beginColdStartLoad (win, targetOrigin, root) {
  const gen = ++loadGeneration
  sharedWin = win
  sharedMountedAt = Date.now()
  sharedReady = false
  try { win.focus() } catch (_) {}

  const onMessage = (event) => {
    try {
      if (gen !== loadGeneration) {
        window.removeEventListener('message', onMessage)
        return
      }
      if (!event || !event.data || typeof event.data !== 'object') return
      if (event.source && event.source !== win) return
      if (event.data.type === 'threeduf-device-loaded') {
        sharedReady = true
        sharedMountedAt = Date.now()
        cancelPendingSends()
        window.removeEventListener('message', onMessage)
        return
      }
      if (event.data.type !== 'threeduf-ready') return
      sharedReady = true
      sharedMountedAt = Date.now()
      doSend(win, targetOrigin, root, 'ready')
      // Stop all timed posts so later in-app edits are not overwritten.
      cancelPendingSends()
      window.removeEventListener('message', onMessage)
    } catch (_) {}
  }
  window.addEventListener('message', onMessage)

  // After a reload the Vue/paper.js boot is ~1–3 s. Do not post during that
  // window — those messages are dropped and a 800 ms listener teardown
  // misses the real ready. One late fallback only if ready never arrives.
  schedule(() => {
    if (gen !== loadGeneration || sharedReady) return
    doSend(win, targetOrigin, root, '2500ms')
  }, 2500)
  schedule(() => {
    try { window.removeEventListener('message', onMessage) } catch (_) {}
  }, 12000)
}

/**
 * Open the 3DuF tab and load device JSON.
 *
 * First click: open https://3duf.org/ and wait for `threeduf-ready`.
 * Later clicks: focus the existing tab (do not change the URL), reload once
 * so a dirty canvas can be replaced, then wait for ready again. Timed
 * fallbacks run only if ready never arrives, and are cancelled as soon as
 * it does, so they cannot restore library JSON over user edits.
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

  cancelPendingSends()
  loadGeneration += 1

  const hadLiveTab = isWindowAlive(sharedWin)
  let win = null

  if (hadLiveTab) {
    // Empty URL focuses the named tab without navigating. Passing the app
    // URL here plus a reload caused a double boot: ready fired, then the
    // page died, and the JSON never landed on the new SPA.
    try { win = window.open('', 'neptune-3duf') } catch (_) {}
    if (!isWindowAlive(win)) win = sharedWin
    if (!isWindowAlive(win)) {
      win = window.open(THREE_DUF_APP_URL, 'neptune-3duf')
    } else {
      forceCleanReload(win)
    }
  } else {
    win = window.open(THREE_DUF_APP_URL, 'neptune-3duf')
  }

  if (!win) {
    return { ok: false, reason: 'popup_blocked' }
  }

  beginColdStartLoad(win, targetOrigin, root)
  return { ok: true, reused: hadLiveTab }
}
