<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

const currentSrc = ref(props.url)
const loaded = ref(false)

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
  loaded.value = false
  currentSrc.value = newUrl
})

function onLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    ratioCache.set(props.url, `${img.naturalWidth} / ${img.naturalHeight}`)
  }
  loaded.value = true
}

function onError() {
  loaded.value = true
  if (props.fallbackUrl && currentSrc.value !== props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
  }
}

function onDblClick() {
  if (props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
  }
}
</script>

<template>
  <div v-if="kind === 'image'" class="relative" :style="containerStyle">
    <div
      v-show="!loaded"
      class="absolute inset-0 bg-slate-800 animate-pulse"
    />
    <img
      :src="currentSrc"
      :alt="alt"
      class="absolute inset-0 w-full h-full object-contain select-none"
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
