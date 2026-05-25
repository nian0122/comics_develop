/** 从 localStorage 读取 JSON，解析失败或缺失时返回 fallbackValue */
export function readLocalStorageJson<T>(key: string, fallbackValue: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key)

    if (raw === null || raw === undefined) {
      return fallbackValue
    }

    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`读取本地存储失败：${String(key)}`, error)
    return fallbackValue
  }
}

/** 将值序列化为 JSON 写入 localStorage，写入失败静默忽略 */
export function writeLocalStorageJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`写入本地存储失败：${String(key)}`, error)
  }
}
