<script setup>
defineProps({
  tools: {
    type: Array,
    default: () => []
  },
  selectedToolName: {
    type: String,
    default: ''
  }
})

defineEmits(['select'])
</script>

<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
    <h2 class="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-slate-400">工具列表</h2>
    <div class="space-y-2">
      <button
        v-for="tool in tools"
        :key="tool.name"
        class="w-full rounded-xl border px-4 py-3 text-left transition"
        :class="tool.name === selectedToolName ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'"
        @click="$emit('select', tool)"
      >
        <div class="font-medium text-white">{{ tool.displayName ?? tool.name }}</div>
        <div class="mt-1 text-xs text-slate-400">{{ tool.description }}</div>
      </button>
    </div>
  </section>
</template>
