<template>
  <div
    class="footer p-3 border-t flex flex-col sm:flex-row justify-between items-center text-sm sticky bottom-0 z-30 shadow-soft footer-transition"
    :class="{ 'footer-hidden': !footerVisible }"
    style="background-color: var(--bg-secondary); border-color: var(--border-color);"
  >
    <!-- 状态信息 -->
    <div class="flex space-x-4 mb-2 sm:mb-0">
      <div class="small" style="color: var(--text-secondary);">{{ status }}</div>
      <div class="small" style="color: var(--text-muted);">本地阅读器 · 不上传图片</div>
    </div>

    <!-- 进度显示 -->
    <div class="small flex items-center space-x-3">
      <div class="font-medium" style="color: var(--text-primary);">
        {{ loadedCount }} / {{ totalCount }} 个文件
      </div>
      <div v-if="totalCount > 0" style="color: var(--text-secondary);">
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