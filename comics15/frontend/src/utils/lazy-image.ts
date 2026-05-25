export interface LazyImageOptions {
  rootMargin?: string
  threshold?: number
}

/**
 * 使用 IntersectionObserver 监听元素进入视口附近时触发加载回调。
 * 不支持 IntersectionObserver 的环境直接触发回调。
 * 返回清理函数，调用后断开观察器。
 */
export function observeLazyImage(
  element: HTMLElement | null,
  onLoad: (element: HTMLElement) => void,
  options: LazyImageOptions = {}
): () => void {
  if (!element) {
    return () => {}
  }

  if (!globalThis.IntersectionObserver) {
    onLoad(element)
    return () => {}
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        onLoad(entry.target as HTMLElement)
        observer.unobserve(entry.target)
      }
    })
  }, {
    rootMargin: options.rootMargin ?? '240px 0px',
    threshold: options.threshold ?? 0.01
  })

  observer.observe(element)

  return () => {
    observer.disconnect()
  }
}
