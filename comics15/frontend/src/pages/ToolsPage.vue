<script setup>
import { computed, onMounted, ref } from 'vue'
import ExecutionHistory from '../components/tools/ExecutionHistory.vue'
import ExecutionPanel from '../components/tools/ExecutionPanel.vue'
import ToolConfig from '../components/tools/ToolConfig.vue'
import ToolList from '../components/tools/ToolList.vue'
import { useToolsStore } from '../stores/tools-store.js'

const toolsStore = useToolsStore()
const selectedTool = ref(null)
const params = ref({})

const selectedToolName = computed(() => selectedTool.value?.name ?? '')

onMounted(() => {
  toolsStore.loadTools()
})

function selectTool(tool) {
  selectedTool.value = tool
  params.value = Object.fromEntries((tool.params ?? []).map((param) => [param.key, param.default ?? '']))
}

function startSelectedTool() {
  if (selectedTool.value) {
    toolsStore.startExecution(selectedTool.value.name, params.value)
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <section class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_1fr]">
      <header class="lg:col-span-2">
        <p class="text-xs uppercase tracking-[0.4em] text-sky-400">Tools</p>
        <h1 class="mt-2 text-2xl font-semibold text-white sm:text-3xl">工具管理</h1>
      </header>

      <ToolList :tools="toolsStore.tools" :selected-tool-name="selectedToolName" @select="selectTool" />

      <div class="space-y-6">
        <ToolConfig v-if="selectedTool" v-model="params" :tool="selectedTool" />
        <button v-if="selectedTool" class="rounded-xl bg-sky-500 px-4 py-3 font-medium text-white" @click="startSelectedTool">
          启动工具
        </button>
        <ExecutionPanel :execution="toolsStore.executionStatus" />
        <ExecutionHistory :executions="toolsStore.executions" />
      </div>
    </section>
  </main>
</template>
