/** 按 '/' 分割路径，过滤空段和首尾空白 */
export function splitRoutePath(path = ''): string[] {
  return String(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

/** 逐段 encodeURIComponent 后重新拼接，保留斜杠层级结构 */
export function encodeRoutePath(path = ''): string {
  return splitRoutePath(path).map(encodeURIComponent).join('/')
}


