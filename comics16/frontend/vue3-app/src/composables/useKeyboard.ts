/**
 * 键盘事件处理
 */
import { onMounted, onUnmounted } from 'vue'

export interface KeyboardConfig {
  onLeft?: () => void
  onRight?: () => void
  onHome?: () => void
  onPageUp?: () => void
  onPageDown?: () => void
  onG?: () => void
  onEscape?: () => void
}

export function useKeyboard(config: KeyboardConfig = {}) {
  const handleKeydown = (e: KeyboardEvent) => {
    // 忽略输入框中的按键
    const activeElement = document.activeElement as HTMLElement
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      return
    }

    switch (e.key) {
      case 'ArrowLeft':
        config.onLeft?.()
        e.preventDefault()
        break
      case 'ArrowRight':
        config.onRight?.()
        e.preventDefault()
        break
      case 'Home':
        config.onHome?.()
        e.preventDefault()
        break
      case 'PageUp':
        config.onPageUp?.()
        e.preventDefault()
        break
      case 'PageDown':
        config.onPageDown?.()
        e.preventDefault()
        break
      case 'g':
      case 'G':
        // 只有在非修饰键时才触发
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          config.onG?.()
          e.preventDefault()
        }
        break
      case 'Escape':
        config.onEscape?.()
        break
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    handleKeydown,
  }
}

/**
 * 滚动事件处理（防抖）
 */
export function useScrollHandler(
  callback: (scrollTop: number, deltaY: number) => void,
  debounceMs: number = 100
) {
  let lastScrollTop = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    const scrollTop = target.scrollTop
    const deltaY = scrollTop - lastScrollTop

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      callback(scrollTop, deltaY)
      lastScrollTop = scrollTop
      timeoutId = null
    }, debounceMs)
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  return {
    handleScroll,
    cleanup,
  }
}
