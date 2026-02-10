<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-300">系列</p>
      <span class="badge">{{ items.length }}</span>
    </div>
    <div class="relative">
      <input
        v-model="keyword"
        type="text"
        placeholder="搜索系列"
        class="w-full rounded-xl bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
      />
      <span class="absolute right-3 top-2.5 text-xs text-slate-500">⌘K</span>
    </div>
    <div class="h-[60vh] overflow-y-auto scrollbar-thin pr-1 space-y-2">
      <div
        v-if="loading"
        class="text-sm text-slate-400"
      >
        正在加载系列...
      </div>
      <button
        v-for="name in filtered"
        :key="name"
        class="w-full text-left rounded-lg px-3 py-2 transition-all border border-transparent hover:border-neon-blue hover:bg-slate-800/60"
        :class="name === selected ? 'bg-slate-800/70 border-neon-blue shadow-lg shadow-neon-purple/30' : 'bg-slate-900/50'"
        @click="$emit('select', name)"
      >
        <p class="font-semibold">{{ name }}</p>
      </button>
      <div
        v-if="!loading && filtered.length === 0"
        class="text-xs text-slate-500"
      >暂无结果</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  items: string[];
  selected: string;
  loading?: boolean;
}>();

const keyword = ref('');

const filtered = computed(() => {
  if (!keyword.value.trim()) return props.items;
  const k = keyword.value.toLowerCase();
  return props.items.filter((s: string) => s.toLowerCase().includes(k));
});

watch(
  () => props.items,
  () => {
    if (keyword.value && filtered.value.length === 0) {
      keyword.value = '';
    }
  },
);
</script>
