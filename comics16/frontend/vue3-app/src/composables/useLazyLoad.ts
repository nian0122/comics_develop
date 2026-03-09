/**
 * 懒加载逻辑封装
 */
import { ref } from 'vue'
import { isImageFile, isVideoFile, isGifFile, useVideoPath } from '@/utils/fileType'
import { useImageUrlBuilder } from './useApi'

export interface LazyLoadImage {
  filename: string
  pathId: string
  seriesName: string
  index: number
}

export interface LazyLoadConfig {
  rootMargin: string
  initialBatch: number
  batchSize: number
}

export interface ImageRetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

const DEFAULT_CONFIG: LazyLoadConfig = {
  rootMargin: '1500px',
  initialBatch: 10,
  batchSize: 10,
}

const DEFAULT_RETRY_CONFIG: ImageRetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
}

interface RetryState {
  retries: number
  status: 'idle' | 'loading' | 'retrying' | 'failed' | 'success'
  lastError: string | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

export function useLazyLoad(config: Partial<LazyLoadConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const retryConfig = DEFAULT_RETRY_CONFIG
  
  const { buildLQImageUrl, buildVideoUrl } = useImageUrlBuilder()

  // State
  const observer = ref<IntersectionObserver | null>(null)
  const nextToObserve = ref(0)
  const loadedCount = ref(0)
  const isObserving = ref(false)
  const imageStates = ref<Map<HTMLElement, RetryState>>(new Map())

  // 获取重试状态
  function getRetryState(container: HTMLElement): RetryState {
    if (!imageStates.value.has(container)) {
      imageStates.value.set(container, {
        retries: 0,
        status: 'idle',
        lastError: null,
        timeoutId: null,
      })
    }
    return imageStates.value.get(container)!
  }

  // 计算重试延迟
  function getRetryDelay(retries: number): number {
    const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, retries)
    return Math.min(delay, retryConfig.maxDelay)
  }

  // 构建媒体 URL
  function buildMediaUrl(filename: string, pathId: string, seriesName: string): string {
    const isVideo = useVideoPath(filename)
    if (isVideo) {
      return buildVideoUrl(seriesName, filename, pathId)
    }
    return buildLQImageUrl(seriesName, filename, pathId)
  }

  // 加载媒体元素
  function loadMediaElement(
    container: HTMLElement,
    options: { forceRetry?: boolean } = {}
  ): void {
    const filename = container.dataset.filename
    const pathId = container.dataset.pathId
    const seriesName = container.dataset.seriesName
    
    if (!filename || !pathId || !seriesName) {
      console.error('[loadMediaElement] Missing dataset:', {
        filename,
        pathId,
        seriesName,
      })
      return
    }
    const isVideo = isVideoFile(filename)
    const isImage = isImageFile(filename)
    const isGif = isGifFile(filename)

    if (!isImage && !isVideo && !isGif) return

    const retryState = getRetryState(container)
    const forceRetry = options.forceRetry === true

    // 如果已经成功加载且不是强制重试，跳过
    if (retryState.status === 'success' && !forceRetry) return

    // 如果达到最大重试次数且不是强制重试，跳过
    if (retryState.retries >= retryConfig.maxRetries &&
        retryState.status === 'failed' && !forceRetry) return

    // 强制重置状态
    if (forceRetry) {
      retryState.retries = 0
      retryState.status = 'loading'
      retryState.lastError = null
      container.dataset.loaded = 'false'
      container.classList.remove('loaded', 'failed')
    }

    const url = buildMediaUrl(filename, pathId, seriesName)
    console.log('[loadMediaElement] URL:', url, { filename, pathId, seriesName })

    // 清理容器
    container.innerHTML = ''

    // 创建媒体元素
    let element: HTMLImageElement | HTMLVideoElement
    if (isVideo) {
      element = document.createElement('video')
      element.className = 'reader-img'
      element.controls = true
      element.autoplay = false
      element.loop = false
      element.preload = 'metadata'
    } else {
      element = document.createElement('img')
      element.className = 'reader-img'
      element.loading = 'lazy'
      element.decoding = 'async'
    }

    // 成功回调
    const onSuccess = () => {
      if (retryState.timeoutId) {
        clearTimeout(retryState.timeoutId)
        retryState.timeoutId = null
      }

      retryState.status = 'success'
      retryState.retries = 0
      container.classList.add('loaded')
      container.classList.remove('failed')
      loadedCount.value++

      container.dispatchEvent(new CustomEvent('image-loaded', { detail: { index: parseInt(container.dataset.index || '0') } }))
    }

    // 失败回调
    const onError = (error: string) => {
      retryState.lastError = error
      retryState.retries++

      if (retryState.retries >= retryConfig.maxRetries) {
        retryState.status = 'failed'
        container.classList.add('loaded', 'failed')
        loadedCount.value++
        console.warn(`[图片加载] 达到最大重试次数: ${filename}`)
      } else {
        retryState.status = 'retrying'
        const delay = getRetryDelay(retryState.retries)
        
        retryState.timeoutId = setTimeout(() => {
          retryState.timeoutId = null
          retryState.status = 'loading'
          loadMediaElement(container, { forceRetry: true })
        }, delay)
      }
    }

    // 设置事件监听
    if (isVideo) {
      element.onloadeddata = onSuccess
      element.onerror = () => onError('video_load_error')
    } else {
      element.onload = onSuccess
      element.onerror = () => onError('image_load_error')
    }

    // 超时保护
    setTimeout(() => {
      if (retryState.status === 'loading') {
        element.src = ''
        onError('timeout')
      }
    }, 10000)

    // 容器存在性检查
    if (!container.parentNode) {
      console.warn('[loadMediaElement] Container was removed, skipping append.')
      return
    }

    container.appendChild(element)
    element.src = url
    container.dataset.loaded = 'true'
  }

  // Intersection Observer 回调
  const observerCallback = (entries: IntersectionObserverEntry[]): void => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const container = entry.target as HTMLElement
        console.log('[Observer] Container intersecting:', {
          filename: container.dataset.filename,
          pathId: container.dataset.pathId,
          seriesName: container.dataset.seriesName,
        })
        const retryState = imageStates.value.get(container)

        if (retryState && retryState.status === 'retrying') return
        if (retryState && retryState.status === 'success') return

        loadMediaElement(container)
      }
    })
  }

  // 初始化观察者
  function initObserver(): void {
    if (observer.value) {
      observer.value.disconnect()
    }

    observer.value = new IntersectionObserver(observerCallback, {
      rootMargin: finalConfig.rootMargin,
      threshold: 0,
    })

    nextToObserve.value = 0
    loadedCount.value = 0
    imageStates.value = new Map()
  }

  // 观察下一批元素
  function observeNextBatch(containers: NodeListOf<Element>): void {
    if (!observer.value) return

    const totalContainers = containers.length
    const endIndex = Math.min(
      nextToObserve.value + finalConfig.batchSize,
      totalContainers
    )
    for (let i = nextToObserve.value; i < endIndex; i++) {
      const container = containers[i] as HTMLElement
      // 检查容器是否仍然在 DOM 中
      if (container && container.parentNode && container.dataset.loaded !== 'true') {
        observer.value.observe(container)
      }
      nextToObserve.value = i + 1
    }

    // 如果没观察到元素但还有容器，继续观察
    if (nextToObserve.value < totalContainers) {
      observeNextBatch(containers)
    }
  }

  // 观察初始批次
  function observeInitialBatch(containers: NodeListOf<Element>): void {
    if (!observer.value) return

    const endIndex = Math.min(finalConfig.initialBatch, containers.length)
    for (let i = 0; i < endIndex; i++) {
      const container = containers[i] as HTMLElement
      if (container) {
        observer.value.observe(container)
      }
    }
    nextToObserve.value = endIndex
  }

  // 清理
  function cleanup(): void {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }

    imageStates.value.forEach(state => {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId)
      }
    })
    imageStates.value.clear()

    nextToObserve.value = 0
    loadedCount.value = 0
    isObserving.value = false
  }

  // 强制加载指定索引的图片
  function forceLoadAtIndex(containers: NodeListOf<Element>, index: number): void {
    const container = containers[index] as HTMLElement
    if (container && container.dataset.loaded !== 'true') {
      loadMediaElement(container, { forceRetry: true })
    }
  }

  // 重试所有失败的图片
  function retryAllFailed(containers: NodeListOf<Element>): void {
    const failedContainers: HTMLElement[] = []
    containers.forEach(container => {
      const state = imageStates.value.get(container as HTMLElement)
      if (state && state.status === 'failed' && state.retries >= retryConfig.maxRetries) {
        failedContainers.push(container as HTMLElement)
      }
    })

    failedContainers.forEach((container, index) => {
      setTimeout(() => {
        loadMediaElement(container, { forceRetry: true })
      }, index * 500)
    })
  }

  return {
    // State
    observer,
    nextToObserve,
    loadedCount,
    isObserving,
    // Methods
    initObserver,
    observeNextBatch,
    observeInitialBatch,
    cleanup,
    forceLoadAtIndex,
    retryAllFailed,
    loadMediaElement,
  }
}
