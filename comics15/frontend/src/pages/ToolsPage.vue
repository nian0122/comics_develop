<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExecutionHistory from '@/components/tools/ExecutionHistory.vue'
import ExecutionPanel from '@/components/tools/ExecutionPanel.vue'
import ToolConfig from '@/components/tools/ToolConfig.vue'
import ToolList from '@/components/tools/ToolList.vue'
import { useToolsStore } from '@/stores/tools-store'
import { fetchRootLevel } from '@/services/api'
import type { ToolInfo, ToolParamOption } from '@/types/tools'

const toolsStore = useToolsStore()
const selectedTool = ref<ToolInfo | null>(null)
const params = ref<Record<string, string>>({})
const seriesOptions = ref<ToolParamOption[]>([])

const selectedToolName = computed(() => selectedTool.value?.name ?? '')
const isRunning = computed(() => toolsStore.executing)
const errorMessage = computed(() => toolsStore.error)

onMounted(async () => {
  toolsStore.loadTools()
  await loadSeriesOptions()
})

async function loadSeriesOptions() {
  try {
    const level = await fetchRootLevel()
    seriesOptions.value = (level.nodes ?? [])
      .filter(n => n.type === 'series')
      .map(n => ({ value: n.name, label: n.name }))
  } catch (e) {
    console.error('获取系列列表失败:', e)
  }
}

function selectTool(tool: ToolInfo) {
  selectedTool.value = tool
  params.value = Object.fromEntries((tool.params ?? []).map((param) => [param.key, param.default ?? '']))
}

async function startSelectedTool() {
  if (selectedTool.value && !isRunning.value) {
    try {
      await toolsStore.startExecution(selectedTool.value.name, params.value)
    } catch {
      // 错误已在 store.error 中，由模板展示
    }
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

      <div v-if="toolsStore.loading" class="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-slate-400">
        加载工具列表中...
      </div>

      <template v-else>
        <ToolList :tools="toolsStore.tools" :selected-tool-name="selectedToolName" @select="selectTool" />

        <div class="space-y-6">
          <div v-if="errorMessage" class="rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {{ errorMessage }}
          </div>

          <ToolConfig v-if="selectedTool" v-model="params" :tool="selectedTool" :series-options="seriesOptions" />
          <button
            v-if="selectedTool"
            class="rounded-xl px-4 py-3 font-medium text-white transition"
            :class="isRunning ? 'cursor-not-allowed bg-sky-500/50' : 'bg-sky-500 hover:bg-sky-400'"
            :disabled="isRunning"
            @click="startSelectedTool"
          >
            {{ isRunning ? '执行中...' : '启动工具' }}
          </button>
          <ExecutionPanel :execution="toolsStore.executionStatus" />
          <ExecutionHistory :executions="toolsStore.executions" />
        </div>
      </template>
    </section>
  </main>
</template>
