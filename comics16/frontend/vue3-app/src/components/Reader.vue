<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, getCurrentInstance, onMounted } from 'vue'
import { useLazyLoad } from '@/composables/useLazyLoad'
import { useReaderStore } from '@/stores/reader'
import { saveProgress } from '@/utils/storage'
import { useImageUrlBuilder } from '@/composables/useApi'

interface Props {
  seriesName: string
  chapterPath: string
  files: string[]
  currentChapterIndex: number
  scale: number
}

const props = defineProps<Props>()
const instance = getCurrentInstance()

const readerStore = useReaderStore()
const { convertLQToHQ } = useImageUrlBuilder()

// 懒加载
const {
  initObserver,
  observeInitialBatch,
  cleanup,
  retryAllFailed,
  loadedCount,
} = useLazyLoad()

// 状态
const readerEl = ref<HTMLElement | null>(null)
const lastClickTime = ref(0)
const DOUBLE_CLICK_TIME_THRESHOLD = 300

// 懒加载容器数据
interface LazyContainer {
  index: number
  filename: string
  pathId: string
  seriesName: string
}

const lazyContainers = ref<LazyContainer[]>([])

// 双击加载 HQ 图片
function handleImageClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.classList.contains('reader-img') || target.tagName !== 'IMG') {
    return
  }

  const currentTime = Date.now()
  if (currentTime - lastClickTime.value < DOUBLE_CLICK_TIME_THRESHOLD) {
    e.preventDefault()
    
    const img = target as HTMLImageElement
    const originalSrc = img.src
    
    // 检查是否已经是 HQ 图片
    if (originalSrc.includes('/hq_image/') || !originalSrc.includes('/api/image/')) {
      return
    }

    const hqSrc = convertLQToHQ(originalSrc)
    console.log(`Double click detected. Loading HQ image: ${hqSrc}`)
    
    img.style.pointerEvents = 'none'
    img.src = hqSrc
    
    img.onload = () => {
      img.style.pointerEvents = 'auto'
      console.log('HQ image loaded successfully.')
    }
    
    img.onerror = () => {
      img.style.pointerEvents = 'auto'
      console.error('Failed to load HQ image, keeping LQ/fallback.')
      img.src = originalSrc
    }
    
    lastClickTime.value = 0
  } else {
    lastClickTime.value = currentTime
  }
}

// 监听文件变化
let isWatcherRunning = false

watch(
  () => [props.files, props.seriesName, props.chapterPath].join('|'),
  async () => {
    // 防止并发执行
    if (isWatcherRunning) {
      console.log('[Reader watcher] Previous operation still running, skipping')
      return
    }
    
    isWatcherRunning = true
    
    try {
      // 清理旧的观察者
      cleanup()
      
      // 空状态检查
      if (!props.files || props.files.length === 0 || !props.seriesName || !props.chapterPath) {
        lazyContainers.value = []
        readerStore.resetProgress()
        return
      }

      // 初始化阅读进度
      readerStore.initProgress(props.files.length)
      
      // 恢复阅读进度
      const savedProgress = readerStore.restoreReaderProgress(props.seriesName, props.currentChapterIndex)
      if (savedProgress && savedProgress.page > 1) {
        readerStore.setCurrentPage(savedProgress.page)
      }

      // 组件已卸载检查
      if (!instance?.isMounted) {
        return
      }

      // 创建懒加载容器数据（响应式）
      lazyContainers.value = props.files.map((filename, index) => ({
        index,
        filename,
        pathId: props.chapterPath,
        seriesName: props.seriesName,
      }))

      // 等待 DOM 更新
      await nextTick()
      
      // 再次检查组件状态
      if (!instance?.isMounted || !readerEl.value) {
        return
      }

      // 初始化观察者
      initObserver()

      // 观察初始批次
      if (!instance?.isMounted || !readerEl.value) {
        return
      }
      
      if (readerEl.value) {
        const containers = readerEl.value.querySelectorAll('.lazy-image-container')
        observeInitialBatch(containers)
      }

      // 保存阅读进度
      if (props.seriesName && props.currentChapterIndex >= 0) {
        saveProgress(props.seriesName, props.currentChapterIndex, {
          page: 1,
          scrollPercent: 0,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('[Reader watcher] Error:', error)
    } finally {
      isWatcherRunning = false
    }
  },
  { immediate: true }
)

// 监听已加载数量
watch(loadedCount, () => {
  readerStore.setLazyLoadLoadedCount(loadedCount.value)
})

// 清理
onUnmounted(() => {
  cleanup()
})

// 暴露方法给父组件
defineExpose({
  retryAllFailed,
})
</script>

<template>
  <div
    id="reader"
    ref="readerEl"
    class="reader flex-grow overflow-y-auto outline-none pt-14 pb-16"
    tabindex="0"
    @click="handleImageClick"
  >
    <!-- 空状态 -->
    <div v-if="!seriesName || !chapterPath || files.length === 0" class="empty-state glass rounded-2xl mx-4">
      <svg class="mx-auto" fill="none" stroke="#8b7765" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253"
        />
      </svg>
      <div class="empty-state-title">请先选择漫画系列和章节</div>
      <div class="empty-state-desc">侧边栏包含您所有的本地漫画系列和章节</div>
    </div>
    
    <!-- 懒加载容器 - 使用 v-for 渲染 -->
    <template v-else>
      <div
        v-for="item in lazyContainers"
        :key="`${item.seriesName}-${item.pathId}-${item.index}`"
        :data-index="String(item.index)"
        :data-filename="String(item.filename)"
        :data-path-id="String(item.pathId)"
        :data-series-name="String(item.seriesName)"
        data-loaded="false"
        class="lazy-image-container"
      >
        <div class="skeleton-wrapper">
          <div class="skeleton-image skeleton" style="height: 200px;"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reader {
  min-height: calc(100vh - 12rem);
  padding: 0;
  background: transparent;
}
</style>
