<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

const currentSrc = ref(props.url)
const status = ref<'loading' | 'loaded' | 'error'>('loading')
let fallbackAttempted = false

watch(() => props.url, (newUrl) => {
  status.value = 'loading'
  fallbackAttempted = false
  currentSrc.value = newUrl
})

function onLoad() {
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
  <div v-if="kind === 'image'" class="relative w-full">
    <!-- 加载中骨架屏 -->
    <div
      v-show="status === 'loading'"
      class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
      style="min-height: 400px"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- 加载失败占位 -->
    <div
      v-show="status === 'error'"
      class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
      style="min-height: 400px"
    >
      <span class="text-3xl select-none">🖼</span>
      <span class="text-xs text-slate-500 select-none">加载失败</span>
    </div>

    <!-- 图片在正常流中，由自身宽高比自然撑开容器 -->
    <img
      :src="currentSrc"
      :alt="alt"
      class="block w-full h-auto select-none"
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
