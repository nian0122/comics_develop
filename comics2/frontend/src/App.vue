<template>
  <div class="min-h-screen text-slate-100">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-grid-light bg-[length:32px_32px] opacity-20"></div>
      <header class="relative border-b border-slate-800 px-6 py-6 backdrop-blur">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-neon-blue/80">次元漫阅</p>
            <h1 class="text-3xl font-black font-display text-white drop-shadow">Comic Reader</h1>
            <p class="text-sm text-slate-300 mt-1">本地漫画 · 零上传 · 极速流式阅读</p>
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <div class="rounded-full bg-slate-900/70 border border-slate-700 px-3 py-1 flex items-center gap-2">
              <span class="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              <span>{{ statusText }}</span>
            </div>
            <div class="rounded-full bg-slate-900/70 border border-slate-700 px-3 py-1 flex items-center gap-2">
              <label class="text-xs text-slate-400">缩放</label>
              <input v-model.number="scale" type="range" min="60" max="140" class="accent-neon-blue" />
              <span class="text-xs">{{ scale }}%</span>
            </div>
          </div>
        </div>
      </header>
    </div>

    <main class="p-6 grid gap-4 lg:grid-cols-[260px_320px_1fr]">
      <section class="glow-card rounded-2xl p-4">
        <SeriesPanel
          :items="series"
          :selected="currentSeries"
          :loading="loading.series"
          @select="selectSeries"
        />
      </section>

      <section class="glow-card rounded-2xl p-4">
        <ChapterPanel
          :seasons="seasons"
          :loading="loading.chapters"
          :selected-season="currentSeason"
          :selected-chapter="currentChapter"
          @select="onChapterSelect"
        />
        <div class="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <button class="btn-secondary rounded-lg px-3 py-1" :disabled="!hasPrev" @click="goPrev">上一话</button>
          <button class="btn-secondary rounded-lg px-3 py-1" :disabled="!hasNext" @click="goNext">下一话</button>
        </div>
      </section>

      <section class="glow-card rounded-2xl p-4">
        <div class="mb-3 flex items-center justify-between text-sm text-slate-300">
          <div>
            <p class="text-xs text-slate-500">当前章节</p>
            <p class="font-semibold">{{ currentChapterLabel }}</p>
          </div>
          <div class="text-xs text-slate-400">{{ files.length }} 页</div>
        </div>
        <ReaderPane
          :files="visibleFiles"
          :url-for="fileUrl"
          :loading="loading.files"
          :scale="scale"
          @reach-bottom="loadMore"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import SeriesPanel from './components/SeriesPanel.vue';
import ChapterPanel from './components/ChapterPanel.vue';
import ReaderPane from './components/ReaderPane.vue';
import {
  fetchSeries,
  fetchSeasons,
  fetchChapters,
  fetchChapterFiles,
  contentUrl,
} from './api/comicApi';

interface SeasonChapters {
  name: string;
  chapters: string[];
}

const series = ref<string[]>([]);
const seasons = ref<SeasonChapters[]>([]);
const currentSeries = ref('');
const currentSeason = ref('');
const currentChapter = ref('');
const files = ref<string[]>([]);
const visibleFiles = ref<string[]>([]);
const scale = ref(100);

const loading = ref({ series: false, chapters: false, files: false });

const statusText = computed(() => {
  if (loading.value.series) return '加载系列';
  if (loading.value.chapters) return '加载章节';
  if (loading.value.files) return '加载页面';
  if (currentSeries.value) return `当前系列：${currentSeries.value}`;
  return '待选择系列';
});

const flatChapters = computed(() =>
  seasons.value.flatMap((s: SeasonChapters) =>
    s.chapters.map((c: string) => ({ season: s.name, chapter: c })),
  ),
);

const selectedIndex = computed(() =>
  flatChapters.value.findIndex(
    (c: { season: string; chapter: string }) =>
      c.season === currentSeason.value && c.chapter === currentChapter.value,
  ),
);

const hasPrev = computed(() => selectedIndex.value > 0);
const hasNext = computed(() =>
  selectedIndex.value >= 0 && selectedIndex.value < flatChapters.value.length - 1,
);

const currentChapterLabel = computed(() => {
  if (!currentChapter.value) return '未选择';
  return `${currentSeason.value} / ${currentChapter.value}`;
});

async function loadSeries() {
  loading.value.series = true;
  try {
    series.value = await fetchSeries();
  } finally {
    loading.value.series = false;
  }
}

async function selectSeries(name: string) {
  if (name === currentSeries.value) return;
  currentSeries.value = name;
  currentSeason.value = '';
  currentChapter.value = '';
  seasons.value = [];
  files.value = [];
  visibleFiles.value = [];
  await loadSeasons(name);
}

async function loadSeasons(name: string) {
  loading.value.chapters = true;
  try {
    const seasonNames = await fetchSeasons(name);
    const seasonsData: SeasonChapters[] = [];
    for (const season of seasonNames) {
      const chapters = await fetchChapters(name, season);
      seasonsData.push({ name: season, chapters });
    }
    seasons.value = seasonsData;
  } finally {
    loading.value.chapters = false;
  }
}

async function onChapterSelect(payload: { season: string; chapter: string }) {
  if (
    payload.season === currentSeason.value &&
    payload.chapter === currentChapter.value &&
    files.value.length
  )
    return;
  currentSeason.value = payload.season;
  currentChapter.value = payload.chapter;
  await loadFiles();
}

async function loadFiles() {
  if (!currentSeries.value || !currentSeason.value || !currentChapter.value) return;
  loading.value.files = true;
  try {
    files.value = await fetchChapterFiles(
      currentSeries.value,
      currentSeason.value,
      currentChapter.value,
    );
    visibleFiles.value = files.value.slice(0, 8);
  } finally {
    loading.value.files = false;
  }
}

function loadMore() {
  if (visibleFiles.value.length >= files.value.length) return;
  visibleFiles.value = files.value.slice(0, visibleFiles.value.length + 8);
}

function goPrev() {
  if (!hasPrev.value) return;
  const prev = flatChapters.value[selectedIndex.value - 1];
  onChapterSelect({ season: prev.season, chapter: prev.chapter });
}

function goNext() {
  if (!hasNext.value) return;
  const next = flatChapters.value[selectedIndex.value + 1];
  onChapterSelect({ season: next.season, chapter: next.chapter });
}

function fileUrl(file: string) {
  return contentUrl(currentSeries.value, currentSeason.value, currentChapter.value, file);
}

onMounted(loadSeries);
</script>
