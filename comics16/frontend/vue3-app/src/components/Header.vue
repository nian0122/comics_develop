<script setup lang="ts">
interface Props {
  seriesTitle: string
  chapterTitle: string
  scale: number
  prevDisabled: boolean
  nextDisabled: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update-scale', value: number): void
  (e: 'prev-chapter'): void
  (e: 'next-chapter'): void
  (e: 'scroll-top'): void
}>()

function handleScaleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update-scale', parseInt(target.value, 10))
}
</script>

<template>
  <div
    class="header absolute top-0 left-0 right-0 z-30 glass rounded-b-xl px-4 py-2 transition-all duration-300 ease-out transform"
    style="transform: translateY(0);"
  >
    <div class="flex flex-col items-center">
      <!-- 标题 -->
      <div class="flex flex-col items-center mb-2">
        <div class="title text-base">{{ seriesTitle }}</div>
        <div class="chapter-title text-xs">{{ chapterTitle }}</div>
      </div>

      <!-- 缩放控制 -->
      <div class="flex items-center justify-center space-x-3">
        <span class="status-text text-xs">缩放</span>
        <input
          :value="scale"
          type="range"
          min="30"
          max="150"
          class="rounded-lg appearance-none cursor-pointer h-3"
          @input="handleScaleInput"
        />
        <span class="progress-text w-12 text-xs text-center">{{ scale }}%</span>
      </div>

      <!-- 导航按钮 -->
      <div class="flex justify-center space-x-3 mt-2">
        <button
          class="glass-btn rounded-xl px-3 py-1.5 text-xs"
          :disabled="prevDisabled"
          @click="emit('prev-chapter')"
        >
          上一章
        </button>
        <button
          class="primary-btn rounded-xl shadow-lg px-3 py-1.5 text-xs"
          :disabled="nextDisabled"
          @click="emit('next-chapter')"
        >
          下一章
        </button>
        <button
          class="glass-btn rounded-xl px-3 py-1.5 text-xs"
          @click="emit('scroll-top')"
        >
          回到顶部
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  z-index: 30;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.header.hidden {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
