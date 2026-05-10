<template>
  <div v-if="selectedTool" class="tool-config">
    <h2 class="text-lg font-semibold mb-2">{{ selectedTool.name }}</h2>
    <p class="text-gray-400 text-sm mb-4">{{ selectedTool.description }}</p>

    <div v-if="selectedTool.params && selectedTool.params.length > 0" class="space-y-3">
      <div v-for="param in selectedTool.params" :key="param.name" class="param-field">
        <label class="block text-sm font-medium mb-1">
          {{ param.label || param.name }}
          <span v-if="param.required" class="text-red-400">*</span>
        </label>

        <select
          v-if="param.type === 'series'"
          v-model="formData[param.name]"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        >
          <option value="">请选择系列</option>
          <option v-for="series in seriesList" :key="series" :value="series">
            {{ series }}
          </option>
        </select>

        <input
          v-else-if="param.type === 'string'"
          v-model="formData[param.name]"
          type="text"
          :placeholder="param.placeholder"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        />

        <input
          v-else-if="param.type === 'number'"
          v-model.number="formData[param.name]"
          type="number"
          :placeholder="param.placeholder"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        />

        <label v-else-if="param.type === 'boolean'" class="flex items-center cursor-pointer">
          <input
            v-model="formData[param.name]"
            type="checkbox"
            class="mr-2"
          />
          <span class="text-sm">{{ param.label }}</span>
        </label>
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
    const value = formData.value[param.name];
    return value !== undefined && value !== '' && value !== null;
  });
});

watch(selectedTool, (newTool) => {
  if (newTool && newTool.params) {
    formData.value = {};
    newTool.params.forEach(param => {
      if (param.type === 'boolean') {
        formData.value[param.name] = param.default || false;
      } else {
        formData.value[param.name] = param.default || '';
      }
    });
  } else {
    formData.value = {};
  }
}, { immediate: true });

function execute() {
  store.executeTool(formData.value);
}
</script>
