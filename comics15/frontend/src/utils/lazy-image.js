export function observeLazyImage(element, onLoad, options = {}) {
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
        onLoad(entry.target)
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
