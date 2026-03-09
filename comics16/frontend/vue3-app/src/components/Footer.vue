<script setup lang="ts">
interface Props {
  progressText: string
  fullProgressText: string
  loadedPages: number
  totalPages: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'show-jump-modal'): void
}>()
</script>

<template>
  <div
    class="footer absolute bottom-0 left-0 right-0 z-30 glass rounded-t-2xl px-6 py-2 transition-all duration-300 ease-out transform"
  >
    <div class="flex flex-row justify-between items-center">
      <!-- 状态 -->
      <div class="status-text text-xs">
        状态：{{ loadedPages }}/{{ totalPages }} 已加载
      </div>

      <!-- 进度和控制 -->
      <div class="flex items-center space-x-2">
        <div
          class="progress-text px-3 py-1 glass rounded-full cursor-pointer hover:bg-white/30 transition-colors text-xs"
          :title="`点击跳转页码 (或按 G 键)\n当前：${fullProgressText}\n已加载：${loadedPages}/${totalPages}`"
          @click="emit('show-jump-modal')"
        >
          {{ progressText }}
        </div>
      </div>

      <!-- 右侧标识 -->
      <div class="status-text text-xs opacity-60">本地阅读器</div>
    </div>
  </div>
</template>

<style scoped>
.footer {
  z-index: 30;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.footer.hidden {
  transform: translateY(100%);
  opacity: 0;
}
</style>
