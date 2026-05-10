<template>
  <section class="tools-page h-screen flex flex-col">
    <header class="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <div>
        <h1 class="text-xl font-bold">工具管理</h1>
        <p class="text-sm text-gray-400">执行和管理系统工具</p>
      </div>
      <a href="/" class="glass-btn text-sm px-4 py-2">
        返回阅读器
      </a>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-64 border-r border-white/10 p-4 overflow-y-auto">
        <ToolList />
      </aside>

      <main class="flex-1 p-6 overflow-y-auto">
        <ToolConfig />
        <ExecutionPanel />
      </main>

      <aside class="w-64 border-l border-white/10 p-4 overflow-y-auto">
        <ExecutionHistory />
      </aside>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useToolsStore } from '../stores/tools-store.js';
import ToolList from '../components/tools/ToolList.vue';
import ToolConfig from '../components/tools/ToolConfig.vue';
import ExecutionPanel from '../components/tools/ExecutionPanel.vue';
import ExecutionHistory from '../components/tools/ExecutionHistory.vue';

const store = useToolsStore();

onMounted(() => {
  store.loadTools();
  store.loadSeries();
  store.loadExecutions();
});

onUnmounted(() => {
  store.stopPolling();
});
</script>
