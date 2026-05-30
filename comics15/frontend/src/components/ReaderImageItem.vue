<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
}>()

const currentSrc = ref(props.url)
const status = ref<'loading' | 'loaded' | 'error'>('loading')
let fallbackAttempted = false

// Reset state when URL changes (DynamicScroller recycling)
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

/** Double-click to switch to fallback URL (manual HQ/LQ toggle) */
function onDblClick() {
  if (props.fallbackUrl && currentSrc.value !== props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
    status.value = 'loading'
    fallbackAttempted = true
  }
}
</script>

<template>
  <div class="relative w-full">
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
      <span class="text-3xl select-none">&#x1F5BC;</span>
      <span class="text-xs text-slate-500 select-none">加载失败</span>
    </div>

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
</template>
