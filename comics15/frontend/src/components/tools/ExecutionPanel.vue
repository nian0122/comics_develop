<script setup lang="ts">
import type { ExecutionStatus } from '@/types/tools'

defineProps<{
  execution: ExecutionStatus | null
}>()
</script>

<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
    <h2 class="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-slate-400">当前执行</h2>
    <div v-if="execution" class="space-y-2 text-sm text-slate-300">
      <p>状态：{{ execution.status ?? '未知' }}</p>
      <p>已处理：{{ execution.processedCount ?? 0 }}</p>
      <p>跳过：{{ execution.skippedCount ?? 0 }}</p>
      <p>错误：{{ execution.errorCount ?? 0 }}</p>
      <p>耗时：{{ execution.durationSeconds ?? 0 }} 秒</p>
      <p>终态：{{ execution.finished ? '是' : '否' }}</p>
      <ul v-if="execution.logs?.length" class="mt-3 max-h-40 space-y-1 overflow-auto rounded-xl bg-slate-950/80 p-3 text-xs text-slate-400">
        <li v-for="log in execution.logs" :key="log">{{ log }}</li>
      </ul>
    </div>
    <p v-else class="text-sm text-slate-400">暂无执行任务</p>
  </section>
</template>
