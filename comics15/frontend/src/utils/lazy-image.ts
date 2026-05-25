export interface LazyImageOptions {
  rootMargin?: string
  threshold?: number
}

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
