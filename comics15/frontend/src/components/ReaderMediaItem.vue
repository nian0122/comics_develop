<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

const currentSrc = ref(props.url)
const status = ref<'loading' | 'loaded' | 'error'>('loading')
let fallbackAttempted = false

// 图片宽高比缓存：key=url, value="w/h" 字符串。
// 同一张图第二次渲染时直接用 aspect-ratio 预留精确高度，零布局跳动。
const ratioCache = new Map<string, string>()

const containerStyle = computed(() => {
  const cached = ratioCache.get(props.url)
  if (cached) {
    return { aspectRatio: cached }
  }
  return { minHeight: '400px' }
})

watch(() => props.url, (newUrl) => {
  status.value = 'loading'
  fallbackAttempted = false
  currentSrc.value = newUrl
})

function onLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    ratioCache.set(props.url, `${img.naturalWidth} / ${img.naturalHeight}`)
  }
  status.value = 'loaded'
}

function onError() {
  if (props.fallbackUrl && !fallbackAttempted) {
    fallbackAttempted = true
    currentSrc.value = props.fallbackUrl
    return
  }
  status.value = 'error'
}

function onDblClick() {
  if (props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
    status.value = 'loading'
    fallbackAttempted = true
  }
}
</script>

<template>
  <div v-if="kind === 'image'" class="relative" :style="containerStyle">
    <!-- 加载中骨架屏 -->
    <div
      v-show="status === 'loading'"
      class="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- 加载失败占位 -->
    <div
      v-show="status === 'error'"
      class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-2"
    >
      <span class="text-3xl select-none">🖼</span>
      <span class="text-xs text-slate-500 select-none">加载失败</span>
    </div>

    <img
      :src="currentSrc"
      :alt="alt"
      class="absolute inset-0 w-full h-full object-cover select-none"
      :class="{ 'invisible': status !== 'loaded' }"
      @load="onLoad"
      @error="onError"
      @dblclick="onDblClick"
    />
  </div>
  <video
    v-else
    :src="currentSrc"
    class="w-full"
    controls
    playsinline
  />
</template>
