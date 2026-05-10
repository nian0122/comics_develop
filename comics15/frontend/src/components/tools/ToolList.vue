<template>
  <div class="tool-list">
    <div class="section-label mb-3">可用工具</div>

    <div v-if="loading" class="loading-indicator">
      <svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
      </svg>
      正在加载...
    </div>

    <div v-else-if="error" class="text-red-400 p-2">
      加载失败
    </div>

    <div v-else-if="tools.length === 0" class="text-gray-500 p-2">
      暂无可用工具
    </div>

    <div v-else class="space-y-1">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="tool-item w-full text-left px-3 py-2 rounded-lg transition-colors border"
        :class="{
          'bg-blue-500/20 border-blue-500/50': selectedTool?.id === tool.id,
          'hover:bg-white/5 border-transparent': selectedTool?.id !== tool.id
        }"
        @click="selectTool(tool)"
      >
        <div class="font-medium text-sm">{{ tool.name }}</div>
        <div class="text-xs text-gray-400 mt-0.5">{{ tool.description }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();

const tools = computed(() => store.tools);
const selectedTool = computed(() => store.selectedTool);
const loading = computed(() => store.loading);
const error = computed(() => store.error);

function selectTool(tool) {
  store.selectTool(tool);
}
</script>
