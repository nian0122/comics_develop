<!--
  对应原 HTML 逻辑块: .header 容器
  - 系列标题和章节标题
  - 缩放滑块控制
  - 上一章/下一章/回到顶部按钮
  - Header 隐藏/显示动画
-->

<template>
  <div
    class="header bg-gray-800 px-3 py-1 border-b border-gray-700 sticky top-0 z-30 shadow-lg header-transition"
    :class="{ 'header-hidden': !headerVisible }"
  >
    <div class="flex flex-col md:flex-row md:justify-between md:items-center">
      <!-- 标题区域 -->
      <div class="mb-1 md:mb-0 flex items-baseline space-x-3">
        <div class="title text-2xl font-bold text-white">{{ seriesTitle }}</div>
        <div class="small text-blue-400 text-base font-medium">{{ chapterTitle }}</div>
      </div>

      <!-- 缩放控制 -->
      <div class="controls flex items-center space-x-2 my-1 mt-2 md:mt-0">
        <label class="small text-gray-400 text-sm whitespace-nowrap">缩放：</label>
        <input
          :value="scale"
          type="range"
          min="30"
          max="150"
          class="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg"
          @input="handleScaleInput"
        />
        <span class="small text-sm w-10 text-right">{{ scale }}%</span>
      </div>
    </div>

    <!-- 导航按钮 -->
    <div class="controls-bottom flex justify-center space-x-3 mt-1 pt-1 border-t border-gray-700">
      <button
        :disabled="!canPrev"
        class="px-5 py-2 text-sm font-medium rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        @click="$emit('prev-chapter')"
      >
        上一章
      </button>
      <button
        :disabled="!canNext"
        class="px-5 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        @click="$emit('next-chapter')"
      >
        下一章
      </button>
      <button
        class="px-5 py-2 text-sm font-medium rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600 transition shadow-md"
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
