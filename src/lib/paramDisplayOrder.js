/** Display order for DIY / library parameter forms. Similar keys stay adjacent; keepout last. */
const PARAMETER_RANK = {
  in: 10,
  out: 11,
  leafs: 12,
  numberOfBends: 13,
  flowChannelWidth: 20,
  controlChannelWidth: 21,
  channelWidth: 22,
  channelRadius: 23,
  gap: 24,
  oilInputWidth: 25,
  waterInputWidth: 26,
  outputWidth: 27,
  outputLength: 28,
  orificeSize: 29,
  orificeLength: 30,
  leafPitch: 35,
  leafSpace: 35,
  stageLength: 36,
  stageSpace: 36,
  spacing: 37,
  valveWidthX: 40,
  valveWidthY: 41,
  valveWidth: 42,
  width: 43,
  length: 44,
  valveRadius: 45,
  bendSpacing: 50,
  bendLength: 51,
  edgeBend: 52,
  edgeBend1: 53,
  edgeBend2: 54,
  portRadius: 60,
  height: 61,
  radius: 62,
  rotation: 80,
  mirrorByX: 81,
  mirrorByY: 82,
  componentSpacing: 900,
  connectionSpacing: 901
}

function rankOf (name) {
  return Object.prototype.hasOwnProperty.call(PARAMETER_RANK, name) ? PARAMETER_RANK[name] : 100
}

export function sortParameterNames (names) {
  return [...names].sort((a, b) => {
    const ra = rankOf(a)
    const rb = rankOf(b)
    if (ra !== rb) return ra - rb
    return String(a).localeCompare(String(b))
  })
}
