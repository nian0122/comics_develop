export function splitRoutePath(path = '') {
  return String(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

export function encodeRoutePath(path = '') {
  return splitRoutePath(path).map(encodeURIComponent).join('/')
}

export function decodeRoutePath(path = '') {
  return splitRoutePath(path).map(decodeURIComponent).join('/')
}
