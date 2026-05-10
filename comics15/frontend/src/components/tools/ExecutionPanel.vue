<template>
  <div v-if="currentExecution" class="execution-panel mt-6 border-t border-white/10 pt-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-medium">执行状态</h3>
      <span
        class="status-badge px-2 py-1 rounded text-xs"
        :class="statusClass"
      >
        {{ statusText }}
      </span>
    </div>

    <div v-if="currentExecution.progress !== undefined" class="mb-3">
      <div class="flex justify-between text-xs text-gray-400 mb-1">
        <span>进度</span>
        <span>{{ currentExecution.progress }}%</span>
      </div>
      <div class="progress-bar h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          class="progress-fill h-full bg-blue-500 transition-all duration-300"
          :style="{ width: currentExecution.progress + '%' }"
        ></div>
      </div>
    </div>

    <div v-if="currentExecution.stats" class="text-xs text-gray-400 mb-3 space-y-1">
      <div v-for="(value, key) in currentExecution.stats" :key="key">
        {{ key }}: {{ value }}
      </div>
    </div>

    <div class="log-container bg-black/30 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs">
      <div v-if="currentExecution.logs && currentExecution.logs.length > 0">
        <div
          v-for="(log, index) in currentExecution.logs"
          :key="index"
          class="log-line mb-1"
          :class="logClass(log)"
        >
          <span class="log-time text-gray-500">{{ formatTime(log.time) }}</span>
          <span class="log-message ml-2">{{ log.message }}</span>
        </div>
      </div>
      <div v-else class="text-gray-500 italic">
        等待日志输出...
      </div>
    </div>

    <button
      v-if="currentExecution.status === 'running'"
      @click="cancel"
      class="danger-btn mt-3 w-full"
    >
      取消执行
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();

const currentExecution = computed(() => store.currentExecution);

const statusText = computed(() => {
  const status = currentExecution.value?.status;
  const map = {
    'running': '运行中',
    'completed': '已完成',
    'error': '出错',
    'cancelled': '已取消'
  };
  return map[status] || status;
});

const statusClass = computed(() => {
  const status = currentExecution.value?.status;
  const map = {
    'running': 'bg-blue-500/20 text-blue-400',
    'completed': 'bg-green-500/20 text-green-400',
    'error': 'bg-red-500/20 text-red-400',
    'cancelled': 'bg-gray-500/20 text-gray-400'
  };
  return map[status] || 'bg-gray-500/20 text-gray-400';
});

function logClass(log) {
  const map = {
    'error': 'text-red-400',
    'warn': 'text-yellow-400'
  };
  return map[log.level] || 'text-gray-300';
}

function formatTime(time) {
  if (!time) return '--:--:--';
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN');
}

function cancel() {
  store.cancelExecution();
}
</script>

<style scoped>
.log-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}
</style>
