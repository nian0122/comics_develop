<template>
  <div class="execution-history">
    <div class="section-label mb-3">执行历史</div>

    <div v-if="executionHistory.length === 0" class="text-gray-500 text-sm p-2">
      暂无执行记录
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="execution in executionHistory.slice(0, 10)"
        :key="execution.id"
        class="execution-item p-2 rounded-lg bg-white/5 border border-white/10"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ formatTime(execution.startTime) }}</span>
          <span
            class="text-xs px-1.5 py-0.5 rounded"
            :class="statusClass(execution.status)"
          >
            {{ statusText(execution.status) }}
          </span>
        </div>
        <div v-if="execution.toolName" class="text-sm mt-1">
          {{ execution.toolName }}
        </div>
      </div>

      <button
        v-if="Object.keys(executions).length > 0"
        @click="cleanup"
        class="text-xs text-red-400 hover:text-red-300 mt-2 px-2 py-1"
      >
        清理历史记录
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();

const executions = computed(() => store.executions);
const executionHistory = computed(() => store.executionHistory);

const statusTextMap = {
  'running': '运行中',
  'completed': '完成',
  'error': '错误',
  'cancelled': '取消'
};

const statusClassMap = {
  'running': 'bg-blue-500/20 text-blue-400',
  'completed': 'bg-green-500/20 text-green-400',
  'error': 'bg-red-500/20 text-red-400',
  'cancelled': 'bg-gray-500/20 text-gray-400'
};

function statusText(status) {
  return statusTextMap[status] || status;
}

function statusClass(status) {
  return statusClassMap[status] || 'bg-gray-500/20 text-gray-400';
}

function formatTime(time) {
  if (!time) return '--';
  const date = new Date(time);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cleanup() {
  store.cleanupExecutions();
}
</script>
