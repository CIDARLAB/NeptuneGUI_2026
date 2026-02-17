// Format to minute (no seconds). Use for "Last edited" / "Modified".
export function getprettytimestamp (datestring = Date.now().toString()) {
  const d = new Date(datestring)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}