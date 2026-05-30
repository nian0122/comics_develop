<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { videoLoadManager, type VideoStatus } from '@/utils/video-load-manager'

const props = defineProps<{
  url: string
  alt: string
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const status = ref<VideoStatus>('idle')

function register() {
  if (!videoRef.value || !containerRef.value) return
  videoLoadManager.register(videoRef.value, containerRef.value, {
    url: props.url,
    onStatusChange: (s) => { status.value = s },
  })
}

onMounted(() => register())

onBeforeUnmount(() => {
  videoLoadManager.unregister(videoRef.value!)
})

// DynamicScroller 回收：URL 变了 → 注销旧，注册新
watch(() => props.url, () => {
  videoLoadManager.unregister(videoRef.value!)
  status.value = 'idle'
  register()
})
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Loading skeleton -->
    <div
      v-show="status === 'loading'"
      class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
      style="min-height: 400px"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- Error placeholder -->
    <div
      v-show="status === 'error'"
      class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
      style="min-height: 400px"
    >
      <span class="text-3xl select-none">🎬</span>
      <span class="text-xs text-slate-500 select-none">视频加载失败</span>
    </div>

    <video
      ref="videoRef"
      preload="none"
      controls
      playsinline
      webkit-playsinline
      class="w-full h-auto block"
      :class="{ 'invisible': status !== 'loaded' }"
      @play="videoLoadManager.onPlay(($event.target as HTMLVideoElement))"
    />
  </div>
</template>
