function pad2 (n) {
  return String(n).padStart(2, '0')
}

// Format to minute (no seconds). Use for "Last edited" / "Modified".
export function getprettytimestamp (datestring = Date.now().toString()) {
  const d = new Date(datestring)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Local `YYYYMMDDHHMM` digits for download filenames (no separators / seconds / timezone). */
export function exportFilenameStamp (date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}`
}