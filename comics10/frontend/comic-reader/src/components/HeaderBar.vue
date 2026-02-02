<template>
  <div
    class="header px-3 py-1 border-b sticky top-0 z-30 shadow-soft header-transition"
    :class="{ 'header-hidden': !headerVisible }"
    style="background-color: var(--bg-secondary); border-color: var(--border-color);"
  >
    <div class="flex flex-col md:flex-row md:justify-between md:items-center">
      <!-- 标题区域 -->
      <div class="mb-1 md:mb-0 flex items-baseline space-x-3">
        <div class="title text-2xl font-bold" style="color: var(--text-primary);">{{ seriesTitle }}</div>
        <div class="small text-base font-medium" style="color: var(--accent-secondary);">{{ chapterTitle }}</div>
      </div>

      <!-- 缩放控制 -->
      <div class="controls flex items-center space-x-2 my-1 mt-2 md:mt-0">
        <label class="small text-sm whitespace-nowrap" style="color: var(--text-secondary);">缩放：</label>
        <input
          :value="scale"
          type="range"
          min="30"
          max="150"
          class="w-24 h-2 rounded-lg appearance-none cursor-pointer"
          style="background-color: var(--bg-tertiary);"
          @input="handleScaleInput"
        />
        <span class="small text-sm w-10 text-right" style="color: var(--text-primary);">{{ scale }}%</span>
      </div>
    </div>

    <!-- 导航按钮 -->
    <div class="controls-bottom flex justify-center space-x-3 mt-1 pt-1" style="border-top-color: var(--border-color);">
      <button
        :disabled="!canPrev"
        class="px-5 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        style="color: var(--text-primary); background-color: var(--bg-tertiary);"
        @click="$emit('prev-chapter')"
      >
        上一章
      </button>
      <button
        :disabled="!canNext"
        class="px-5 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        style="color: white; background-color: var(--accent-primary);"
        @click="$emit('next-chapter')"
      >
        下一章
      </button>
      <button
        class="px-5 py-2 text-sm font-medium rounded-lg transition shadow-md"
        style="color: var(--text-primary); background-color: var(--bg-tertiary);"
        @click="$emit('scroll-top')"
      >
        回到顶部
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  seriesTitle: string;
  chapterTitle: string;
  scale: number;
  canPrev: boolean;
  canNext: boolean;
  headerVisible: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  'prev-chapter': [];
  'next-chapter': [];
  'scroll-top': [];
  'update:scale': [value: number];
}>();

// 处理缩放输入
function handleScaleInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const value = parseInt(target.value, 10);
  emit('update:scale', value);
}
</script>