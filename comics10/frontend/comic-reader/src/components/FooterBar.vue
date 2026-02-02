<!--
  对应原 HTML 逻辑块: .footer 容器
  - 状态信息
  - 本地阅读器提示
  - 进度显示
  - Footer 隐藏/显示动画
-->

<template>
  <div
    class="footer bg-gray-800 p-3 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center text-sm sticky bottom-0 z-30 shadow-lg footer-transition"
    :class="{ 'footer-hidden': !footerVisible }"
  >
    <!-- 状态信息 -->
    <div class="flex space-x-4 mb-2 sm:mb-0">
      <div class="small text-gray-400">{{ status }}</div>
      <div class="small text-gray-500">本地阅读器 · 不上传图片</div>
    </div>

    <!-- 进度显示 -->
    <div class="small flex items-center space-x-3">
      <div class="text-white font-medium">
        {{ loadedCount }} / {{ totalCount }} 个文件
      </div>
      <div v-if="totalCount > 0" class="text-gray-400">
        {{ progressPercent }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: string;
  loadedCount: number;
  totalCount: number;
  footerVisible: boolean;
}

const props = defineProps<Props>();

// 进度百分比
const progressPercent = computed(() => {
  if (props.totalCount === 0) return 0;
  return Math.round((props.loadedCount / props.totalCount) * 100);
});
</script>
