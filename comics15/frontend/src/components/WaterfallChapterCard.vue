<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  chapter: {
    name: string
    path: string
    pathId: string
    fileCount?: number
    coverUrl?: string
    progressText?: string
  }
}>()

const emit = defineEmits<{
  select: [chapter: Record<string, unknown>]
}>()

const coverFailed = ref(false)

const pageLabel = computed(() => `${props.chapter.fileCount ?? 0} 页`)

// 5 种渐变色循环，按 chapter pathId 哈希分配
const gradientColors = [
  'linear-gradient(135deg, #ef4444, #f97316, #eab308)',
  'linear-gradient(135deg, #f97316, #f59e0b, #facc15)',
  'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
  'linear-gradient(135deg, #0ea5e9, #06b6d4, #14b8a6)',
  'linear-gradient(135deg, #22c55e, #10b981, #14b8a6)',
]

const shadowColors = [
  'shadow-red-900/20',
  'shadow-orange-900/20',
  'shadow-purple-900/20',
  'shadow-cyan-900/20',
  'shadow-green-900/20',
]

function hashIndex(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % gradientColors.length
}

const colorIndex = computed(() => hashIndex(props.chapter.pathId))
const fallbackGradient = computed(() => gradientColors[colorIndex.value])
const shadowClass = computed(() => shadowColors[colorIndex.value])

function onSelect() {
  emit('select', props.chapter as Record<string, unknown>)
}

function onCoverError() {
  coverFailed.value = true
}
</script>

<template>
  <button
    class="manga-card flex-shrink-0 w-[130px] text-left"
    @click="onSelect"
  >
    <!-- Cover -->
    <div
      class="relative h-[180px] w-[130px] overflow-hidden rounded-lg shadow-lg"
      :class="shadowClass"
      :style="{ background: fallbackGradient }"
    >
      <img
        v-if="chapter.coverUrl && !coverFailed"
        :src="chapter.coverUrl"
        :alt="chapter.name"
        class="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        @error="onCoverError"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
    <!-- Info -->
    <p class="mt-2 truncate text-sm font-medium text-slate-200">{{ chapter.name }}</p>
    <p class="mt-0.5 text-xs text-slate-500">{{ pageLabel }}</p>
    <p
      v-if="chapter.progressText"
      class="mt-0.5 text-xs text-sky-400"
    >{{ chapter.progressText }}</p>
  </button>
</template>

<style scoped>
/* ── Card hover / active ── */
.manga-card {
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
}
.manga-card:hover {
  transform: translateY(-4px);
}
.manga-card:active {
  transform: scale(0.97);
}
</style>
