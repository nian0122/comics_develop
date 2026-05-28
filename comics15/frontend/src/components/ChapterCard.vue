<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCoverQueue } from '@/composables/useCoverQueue'

const props = defineProps<{
  chapter: {
    name: string
    type?: string
    path: string
    pathId: string
    fileCount?: number
    coverUrl?: string
    loading?: boolean
    pathText?: string
    progressText?: string
  }
  active?: boolean
}>()

const emit = defineEmits<{
  select: [chapter: Record<string, unknown>]
}>()

const coverQueue = useCoverQueue()
const coverContainer = ref<HTMLElement | null>(null)
const shouldLoadCover = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!coverContainer.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        observer?.disconnect()
        coverQueue.schedule(() => {
          shouldLoadCover.value = true
        })
      }
    },
    { rootMargin: '100px' }
  )
  observer.observe(coverContainer.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  coverQueue.dispose()
  clearSkeletonTimer()
})

const coverStatus = ref<'loading' | 'loaded' | 'error'>('loading')
const showSkeleton = ref(false)
let lastCoverUrl: string | undefined = props.chapter.coverUrl
let coverLoadReleased = false
let skeletonTimer: ReturnType<typeof setTimeout> | null = null

watch([shouldLoadCover, coverStatus], ([isLoading, status]) => {
  clearSkeletonTimer()
  if (isLoading && status === 'loading') {
    skeletonTimer = setTimeout(() => {
      showSkeleton.value = true
    }, 200)
  } else {
    showSkeleton.value = false
  }
})

function clearSkeletonTimer() {
  if (skeletonTimer !== null) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
}

watch(() => props.chapter.coverUrl, (newUrl) => {
  if (newUrl !== lastCoverUrl) {
    lastCoverUrl = newUrl
    coverStatus.value = 'loading'
    coverLoadReleased = false
  }
})

const pageLabel = computed(() => `${props.chapter.fileCount ?? 0} 页`)
const rootClasses = computed(() => [
  'group flex w-full overflow-hidden rounded-2xl border text-left transition',
  props.active
    ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500'
    : 'border-slate-800 bg-slate-900/80 hover:border-sky-500 hover:bg-slate-900'
])

function onSelect() {
  emit('select', props.chapter as Record<string, unknown>)
}

function onCoverLoad() {
  coverStatus.value = 'loaded'
  if (!coverLoadReleased) {
    coverLoadReleased = true
    coverQueue.release()
  }
}

function onCoverError() {
  coverStatus.value = 'error'
  if (!coverLoadReleased) {
    coverLoadReleased = true
    coverQueue.release()
  }
}

defineExpose({ onCoverError })
</script>

<template>
  <button
    :class="rootClasses"
    @click="onSelect"
  >
    <div ref="coverContainer" class="h-28 w-20 shrink-0 bg-slate-800 sm:h-32 sm:w-24">
      <!-- 数据加载骨架 -->
      <div
        v-if="chapter.loading"
        data-cover-skeleton="true"
        class="h-full w-full animate-pulse bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700"
      ></div>

      <template v-else-if="chapter.coverUrl">
        <!-- 图片加载骨架：200ms 后仍未加载完成才出现 -->
        <div
          v-show="showSkeleton"
          class="h-full w-full animate-pulse bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700"
        ></div>

        <!-- 加载失败占位 -->
        <div
          v-if="coverStatus === 'error'"
          class="flex h-full items-center justify-center"
        >
          <span class="px-2 text-center text-xs text-slate-400">暂无封面</span>
        </div>

        <img
          v-if="shouldLoadCover && coverStatus !== 'error'"
          :src="chapter.coverUrl"
          :alt="chapter.name"
          class="h-full w-full object-cover"
          :class="{ 'invisible': coverStatus !== 'loaded' }"
          decoding="async"
          fetchpriority="low"
          @load="onCoverLoad"
          @error="onCoverError"
        />
      </template>

      <div v-else class="flex h-full items-center justify-center text-sm text-slate-400">
        <span class="px-2 text-center text-xs">暂无封面</span>
      </div>
    </div>

    <div class="flex flex-1 flex-col justify-between gap-2 px-4 py-3">
      <div class="space-y-1">
        <h3 class="line-clamp-2 text-sm font-medium text-white">{{ chapter.name }}</h3>
        <p v-if="chapter.pathText" class="text-xs text-slate-400">{{ chapter.pathText }}</p>
      </div>
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span>{{ pageLabel }}</span>
        <span v-if="chapter.progressText">{{ chapter.progressText }}</span>
      </div>
    </div>
  </button>
</template>
