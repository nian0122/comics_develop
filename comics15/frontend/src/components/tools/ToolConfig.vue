<template>
  <div v-if="selectedTool" class="tool-config">
    <h2 class="text-lg font-semibold mb-2">{{ selectedTool.displayName || selectedTool.name }}</h2>
    <p class="text-gray-400 text-sm mb-4">{{ selectedTool.description }}</p>

    <div v-if="selectedTool.params && selectedTool.params.length > 0" class="space-y-3">
      <div v-for="param in selectedTool.params" :key="param.key" class="param-field">
        <label class="block text-sm font-medium mb-1">
          {{ param.label || param.key }}
          <span v-if="param.required" class="text-red-400">*</span>
        </label>

        <select
          v-if="param.key === 'series'"
          v-model="formData[param.key]"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        >
          <option value="">请选择系列</option>
          <option v-for="series in seriesList" :key="series" :value="series">
            {{ series }}
          </option>
        </select>

        <select
          v-else-if="param.type === 'select'"
          v-model="formData[param.key]"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        >
          <option value="">请选择</option>
          <option value="true">是</option>
          <option value="false">否</option>
        </select>

        <input
          v-else-if="param.type === 'text'"
          v-model="formData[param.key]"
          type="text"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        />

        <input
          v-else-if="param.type === 'number'"
          v-model.number="formData[param.key]"
          type="number"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        />
      </div>
    </div>

    <div v-else class="text-gray-400 text-sm italic">
      此工具无需配置参数
    </div>

    <button
      @click="execute"
      :disabled="!canExecute || hasRunningExecution"
      class="primary-btn mt-4 w-full"
      :class="{ 'opacity-50 cursor-not-allowed': !canExecute || hasRunningExecution }"
    >
      {{ hasRunningExecution ? '执行中...' : '执行工具' }}
    </button>
  </div>

  <div v-else class="text-center text-gray-500 py-8">
    请从左侧选择一个工具
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();
const formData = ref({});

const selectedTool = computed(() => store.selectedTool);
const seriesList = computed(() => store.seriesList);
const hasRunningExecution = computed(() => store.hasRunningExecution);

const canExecute = computed(() => {
  if (!selectedTool.value) return false;
  if (!selectedTool.value.params) return true;

  return selectedTool.value.params.every(param => {
    if (!param.required) return true;
    const value = formData.value[param.key];
    return value !== undefined && value !== '' && value !== null;
  });
});

watch(selectedTool, (newTool) => {
  if (newTool && newTool.params) {
    formData.value = {};
    newTool.params.forEach(param => {
      formData.value[param.key] = param.default || '';
    });
  } else {
    formData.value = {};
  }
}, { immediate: true });

function execute() {
  store.executeTool(formData.value);
}
</script>
