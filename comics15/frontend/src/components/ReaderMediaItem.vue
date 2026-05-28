<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

const currentSrc = ref(props.url)
const status = ref<'loading' | 'loaded' | 'error'>('loading')
const videoStatus = ref<'loading' | 'loaded' | 'error'>('loading')
let fallbackAttempted = false
let videoFallbackAttempted = false

/** 根据文件扩展名推断 MIME type，Safari 需要此信息才能确定视频是否可解码 */
const videoType = computed(() => {
  const url = currentSrc.value.toLowerCase()
  if (url.endsWith('.mp4')) return 'video/mp4'
  if (url.endsWith('.webm')) return 'video/webm'
  if (url.endsWith('.mov')) return 'video/quicktime'
  if (url.endsWith('.gif')) return 'image/gif'
  return undefined
})

watch(() => props.url, (newUrl) => {
  status.value = 'loading'
  videoStatus.value = 'loading'
  fallbackAttempted = false
  videoFallbackAttempted = false
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

function onVideoLoaded() {
  videoStatus.value = 'loaded'
}

function onVideoError() {
  if (props.fallbackUrl && !videoFallbackAttempted) {
    videoFallbackAttempted = true
    videoStatus.value = 'loading'
    currentSrc.value = props.fallbackUrl
    return
  }
  videoStatus.value = 'error'
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
  <div v-else class="relative w-full">
    <!-- 视频加载中骨架屏 -->
    <div
      v-show="videoStatus === 'loading'"
      class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
      style="min-height: 400px"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- 视频加载失败占位 -->
    <div
      v-show="videoStatus === 'error'"
      class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
      style="min-height: 400px"
    >
      <span class="text-3xl select-none">🎬</span>
      <span class="text-xs text-slate-500 select-none">视频加载失败</span>
    </div>

    <!--
      视频元素要点：
      - source + type 是 Safari 能播放的关键：Safari 需要明确的 MIME type 来判断解码能力
      - preload="metadata" 避免 Safari 下载完整视频后才显示首帧
      - playsinline + webkit-playsinline 确保 iOS Safari 内联播放
      - 外层 relative 容器重置 vue-virtual-scroller 的 CSS transform 堆叠上下文，防止原生控件不可点击
    -->
    <video
      class="w-full h-auto block"
      :class="{ 'invisible': videoStatus !== 'loaded' }"
      controls
      playsinline
      webkit-playsinline
      preload="metadata"
      @loadeddata="onVideoLoaded"
      @error="onVideoError"
    >
      <source
        :src="currentSrc"
        :type="videoType"
      />
      您的浏览器不支持视频播放。
    </video>
  </div>
</template>
