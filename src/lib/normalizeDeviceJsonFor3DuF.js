/**
 * Normalize Parchmint / library seed JSON so 3DuF previews are readable.
 * Library previews use compact boards (40k² or 80k²) instead of full-chip size.
 */

const LIBRARY_BOARD_SMALL = 40000
const LIBRARY_BOARD_LARGE = 80000
const MARGIN = 2000

const LARGE_LIBRARY_NAMES = new Set(['tree', 'mux'])

function asXy (pt) {
  if (Array.isArray(pt) && pt.length >= 2 && Number.isFinite(Number(pt[0])) && Number.isFinite(Number(pt[1]))) {
    return [Number(pt[0]), Number(pt[1])]
  }
  return null
}

function translatePoint (pt, dx, dy) {
  const xy = asXy(pt)
  if (!xy) return pt
  return [xy[0] + dx, xy[1] + dy]
}

function translateNested (obj, dx, dy) {
  if (!Array.isArray(obj)) return obj
  if (obj.length === 2 && typeof obj[0] === 'number' && typeof obj[1] === 'number') {
    return [obj[0] + dx, obj[1] + dy]
  }
  return obj.map((item) => translateNested(item, dx, dy))
}

function contentBBox (device) {
  const xs = []
  const ys = []
  const push = (xy) => {
    if (!xy) return
    xs.push(xy[0])
    ys.push(xy[1])
  }

  ;(device.components || []).forEach((c) => {
    const pos = asXy(c && c.params && c.params.position)
    if (!pos) return
    const xspan = Number(c['x-span'] || 0)
    const yspan = Number(c['y-span'] || 0)
    xs.push(pos[0] - xspan / 2, pos[0] + xspan / 2)
    ys.push(pos[1] - yspan / 2, pos[1] + yspan / 2)
  })

  ;(device.connections || []).forEach((conn) => {
    const params = (conn && conn.params) || {}
    push(asXy(params.start))
    push(asXy(params.end))
    ;(params.wayPoints || []).forEach((wp) => push(asXy(wp)))
    ;(params.segments || []).forEach((seg) => {
      ;(seg || []).forEach((pt) => push(asXy(pt)))
    })
    ;(conn.paths || []).forEach((path) => {
      ;(path.wayPoints || []).forEach((wp) => push(asXy(wp)))
    })
  })

  if (!xs.length) return null
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function translateDevice (device, dx, dy) {
  ;(device.components || []).forEach((c) => {
    if (!c.params) c.params = {}
    if (c.params.position != null) {
      c.params.position = translatePoint(c.params.position, dx, dy)
    }
  })
  ;(device.connections || []).forEach((conn) => {
    if (!conn.params) conn.params = {}
    ;['start', 'end'].forEach((key) => {
      if (conn.params[key] != null) {
        conn.params[key] = translatePoint(conn.params[key], dx, dy)
      }
    })
    if (conn.params.wayPoints) {
      conn.params.wayPoints = translateNested(conn.params.wayPoints, dx, dy)
    }
    if (conn.params.segments) {
      conn.params.segments = translateNested(conn.params.segments, dx, dy)
    }
    ;(conn.paths || []).forEach((path) => {
      if (path.wayPoints) path.wayPoints = translateNested(path.wayPoints, dx, dy)
    })
  })
}

function ensureLayers (device) {
  if (!Array.isArray(device.layers) || !device.layers.length) {
    device.layers = [
      { name: 'FLOW_0', id: '0', type: 'FLOW', params: { z_offset: 0, flip: false }, group: '0' },
      { id: '1', name: 'CONTROL_0', type: 'CONTROL', params: { z_offset: 0, flip: false }, group: '0' },
    ]
    return
  }
  let hasFlow = false
  let hasControl = false
  device.layers.forEach((layer) => {
    const type = String(layer.type || '').toUpperCase()
    if (type === 'FLOW') hasFlow = true
    if (type === 'CONTROL') hasControl = true
    layer.group = '0'
    if (!layer.params || typeof layer.params !== 'object') {
      layer.params = { z_offset: 0, flip: false }
    } else {
      if (layer.params.z_offset == null) layer.params.z_offset = 0
      if (layer.params.flip == null) layer.params.flip = false
    }
  })
  if (hasFlow && !hasControl) {
    device.layers.push({
      id: '1',
      name: 'CONTROL_0',
      type: 'CONTROL',
      params: { z_offset: 0, flip: false },
      group: '0',
    })
  }
}

function looksLikeLibraryPreview (device, bbox) {
  const comps = Array.isArray(device.components) ? device.components : []
  if (comps.length === 0 || comps.length > 12) return false
  const name = String(device.name || '').toLowerCase()
  if (name && (LARGE_LIBRARY_NAMES.has(name) || [
    'channel', 'mixer', 'nozzle_droplet_generator', 'picoinjector', 'port', 'reaction_chamber', 'valve3d',
  ].includes(name))) {
    return true
  }
  // Heuristic: few components and modest content span → library preview, not a full chip.
  if (!bbox) return comps.length <= 3
  const bw = bbox[2] - bbox[0]
  const bh = bbox[3] - bbox[1]
  return comps.length <= 6 && bw <= 60000 && bh <= 60000
}

function preferredLibraryBoard (device) {
  const name = String(device.name || '').toLowerCase()
  if (LARGE_LIBRARY_NAMES.has(name)) return LIBRARY_BOARD_LARGE
  return LIBRARY_BOARD_SMALL
}

function boardSize (device) {
  const p = device.params || {}
  const w = Number(p.width != null ? p.width : p['x-span'])
  const h = Number(p.length != null ? p.length : p['y-span'])
  return {
    w: Number.isFinite(w) && w > 0 ? w : LIBRARY_BOARD_SMALL,
    h: Number.isFinite(h) && h > 0 ? h : LIBRARY_BOARD_SMALL,
  }
}

function needsLibraryCompact (bbox, board, targetSide) {
  if (!bbox) return false
  const [minX, minY, maxX, maxY] = bbox
  const overflows = minX < -1 || minY < -1 || maxX > board.w + 1 || maxY > board.h + 1
  const tooLarge = board.w > targetSide * 1.15 || board.h > targetSide * 1.15
  const nearCorner = minX < board.w * 0.08 && minY < board.h * 0.08 && maxX < board.w * 0.45 && maxY < board.h * 0.45
  return overflows || tooLarge || nearCorner
}

/**
 * @param {object} jsonObject device JSON
 * @returns {object} deep-cloned, normalized device JSON
 */
export function normalizeDeviceJsonFor3DuF (jsonObject) {
  if (!jsonObject || typeof jsonObject !== 'object' || Array.isArray(jsonObject)) {
    return jsonObject
  }
  const device = JSON.parse(JSON.stringify(jsonObject))
  ensureLayers(device)

  if (!device.params || typeof device.params !== 'object') device.params = {}
  const bbox = contentBBox(device)
  let board = boardSize(device)

  if (bbox && looksLikeLibraryPreview(device, bbox)) {
    const target = preferredLibraryBoard(device)
    if (needsLibraryCompact(bbox, board, target)) {
      const needW = (bbox[2] - bbox[0]) + 2 * MARGIN
      const needH = (bbox[3] - bbox[1]) + 2 * MARGIN
      board = {
        w: Math.max(target, needW),
        h: Math.max(target, needH),
      }
      const cx = (bbox[0] + bbox[2]) / 2
      const cy = (bbox[1] + bbox[3]) / 2
      translateDevice(device, board.w / 2 - cx, board.h / 2 - cy)
    }
  } else if (bbox) {
    // Full-chip / Jobs PR JSON: only re-center if overflowing or stuck in a corner.
    const [minX, minY, maxX, maxY] = bbox
    const overflows = minX < -1 || minY < -1 || maxX > board.w + 1 || maxY > board.h + 1
    const nearCorner = minX < board.w * 0.05 && minY < board.h * 0.05 && maxX < board.w * 0.35 && maxY < board.h * 0.35
    if (overflows || nearCorner) {
      const needW = (bbox[2] - bbox[0]) + 2 * MARGIN
      const needH = (bbox[3] - bbox[1]) + 2 * MARGIN
      board = {
        w: Math.max(board.w, needW),
        h: Math.max(board.h, needH),
      }
      const cx = (bbox[0] + bbox[2]) / 2
      const cy = (bbox[1] + bbox[3]) / 2
      translateDevice(device, board.w / 2 - cx, board.h / 2 - cy)
    }
  }

  device.params.width = board.w
  device.params.length = board.h
  device.params['x-span'] = board.w
  device.params['y-span'] = board.h

  if (!Array.isArray(device.components)) device.components = []
  if (!Array.isArray(device.connections)) device.connections = []
  if (!Array.isArray(device.valves)) device.valves = []
  if (device.version == null) device.version = '1.2'
  if (device.IsPlacedAndRouted == null) device.IsPlacedAndRouted = true

  return device
}
