export function splitRoutePath(path = ''): string[] {
  return String(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

export function encodeRoutePath(path = ''): string {
  return splitRoutePath(path).map(encodeURIComponent).join('/')
}

export function decodeRoutePath(path = ''): string {
  return splitRoutePath(path).map(decodeURIComponent).join('/')
}
