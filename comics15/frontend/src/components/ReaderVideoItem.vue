<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { videoLoadManager } from '@/utils/video-load-manager'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const status = ref<'idle' | 'loading' | 'loaded' | 'playing' | 'paused' | 'error'>('idle')
const currentSrc = ref(props.url)
let fallbackAttempted = false

function onError(tryFallback: () => void) {
  if (props.fallbackUrl && !fallbackAttempted) {
    fallbackAttempted = true
    status.value = 'loading'
    currentSrc.value = props.fallbackUrl
    tryFallback()
    return
  }
  status.value = 'error'
}

function onLoaded() {
  status.value = 'loaded'
}

function onAborted() {
  status.value = 'idle'
}

function onPlay() {
  status.value = 'playing'
  if (videoRef.value) {
    videoLoadManager.onUserPlayed(videoRef.value)
  }
}

function onPause() {
  status.value = 'paused'
}

// URL change — re-register with Manager (DynamicScroller recycling)
watch(() => props.url, (newUrl) => {
  if (videoRef.value && containerRef.value) {
    videoLoadManager.unregister(videoRef.value)
    fallbackAttempted = false
    currentSrc.value = newUrl
    status.value = 'idle'
    videoLoadManager.register(videoRef.value, containerRef.value, {
      url: newUrl,
      onLoaded,
      onError,
      onAborted,
    })
  }
})

onMounted(() => {
  if (videoRef.value && containerRef.value) {
    videoLoadManager.register(videoRef.value, containerRef.value, {
      url: props.url,
      onLoaded,
      onError,
      onAborted,
    })
  }
})

onBeforeUnmount(() => {
  if (videoRef.value) {
    videoLoadManager.unregister(videoRef.value)
  }
})

function isVisible() {
  return ['loaded', 'playing', 'paused'].includes(status.value)
}
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
      <span class="text-3xl select-none">&#x1F3AC;</span>
      <span class="text-xs text-slate-500 select-none">视频加载失败</span>
    </div>

    <!--
      preload="none" — browser does NOT auto-load.
      Manager sets video.src and video.preload = 'metadata' directly in JS.
      No :src binding to avoid Vue reactivity conflicting with browser video state.
      playsinline + webkit-playsinline for iOS Safari inline playback.
    -->
    <video
      ref="videoRef"
      class="w-full h-auto block"
      :class="{ 'invisible': !isVisible() }"
      controls
      playsinline
      webkit-playsinline
      preload="none"
      @play="onPlay"
      @pause="onPause"
    />
  </div>
</template>
