<script setup lang="ts">
import type { ExecutionsMap } from '@/types/tools'

defineProps<{
  executions: ExecutionsMap
}>()
</script>

<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
    <h2 class="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-slate-400">执行历史</h2>
    <ul v-if="Object.keys(executions).length > 0" class="space-y-2 text-sm text-slate-300">
      <li v-for="execution in Object.values(executions)" :key="execution.executionId" class="rounded-xl bg-slate-950/70 px-3 py-2">
        {{ execution.toolName ?? execution.executionId }} · {{ execution.status ?? '未知' }}
      </li>
    </ul>
    <p v-else class="text-sm text-slate-400">暂无历史记录</p>
  </section>
</template>
