<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  chapter: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])
const coverFailed = ref(false)

const pageLabel = computed(() => `${props.chapter.totalFiles ?? 0} 页`)
const rootClasses = computed(() => [
  'group flex w-full overflow-hidden rounded-2xl border text-left transition',
  props.active
    ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500'
    : 'border-slate-800 bg-slate-900/80 hover:border-sky-500 hover:bg-slate-900'
])

function onSelect() {
  emit('select', props.chapter)
}

function onCoverError() {
  coverFailed.value = true
}

defineExpose({ onCoverError })
</script>

<template>
  <button
    :class="rootClasses"
    @click="onSelect"
  >
    <div class="h-28 w-20 shrink-0 bg-slate-800 sm:h-32 sm:w-24">
      <div
        v-if="chapter.loading"
        data-cover-skeleton="true"
        class="h-full w-full animate-pulse bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700"
      ></div>
      <img
        v-else-if="chapter.coverUrl && !coverFailed"
        :src="chapter.coverUrl"
        :alt="chapter.name"
        class="h-full w-full object-cover"
        loading="lazy"
        @error="onCoverError"
      />
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
