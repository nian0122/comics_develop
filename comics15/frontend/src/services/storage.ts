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

export function writeLocalStorageJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`写入本地存储失败：${String(key)}`, error)
  }
}
