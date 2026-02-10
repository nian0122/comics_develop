<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-300">章节</p>
      <span class="badge">{{ total }}</span>
    </div>
    <div class="h-[60vh] overflow-y-auto scrollbar-thin pr-1 space-y-2">
      <div v-if="loading" class="text-sm text-slate-400">正在加载章节...</div>
      <div v-else-if="seasons.length === 0" class="text-xs text-slate-500">请选择系列</div>
      <div v-else class="space-y-4">
        <div v-for="season in seasons" :key="season.name" class="space-y-2">
          <div class="text-xs uppercase tracking-[0.2em] text-neon-blue/80 font-semibold">{{ season.name }}</div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="chapter in season.chapters"
              :key="chapter"
              class="truncate text-left rounded-lg px-3 py-2 border border-slate-700/60 bg-slate-900/50 hover:border-neon-blue hover:bg-slate-800/60 transition"
              :class="isSelected(season.name, chapter) ? 'border-neon-blue bg-slate-800 shadow-lg shadow-neon-blue/20' : ''"
              @click="$emit('select', { season: season.name, chapter })"
            >
              <span class="text-sm">{{ chapter }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  seasons: { name: string; chapters: string[] }[];
  loading?: boolean;
  selectedSeason?: string;
  selectedChapter?: string;
}>();

const total = computed(() =>
  props.seasons.reduce((sum: number, s: { name: string; chapters: string[] }) => {
    return sum + s.chapters.length;
  }, 0),
);

const isSelected = (season: string, chapter: string) =>
  props.selectedSeason === season && props.selectedChapter === chapter;
</script>
