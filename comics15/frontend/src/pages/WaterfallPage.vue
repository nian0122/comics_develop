<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import WaterfallChapterCard from '@/components/WaterfallChapterCard.vue'
import { createSeriesReadRoute, createSeriesRootRoute } from '@/router'
import { fetchLevel } from '@/services/api'
import { useProgressStore } from '@/stores/progress-store'
import { useSeriesStore } from '@/stores/series-store'
import type { LevelNode } from '@/types/api'

const seriesStore = useSeriesStore()
const progressStore = useProgressStore()
const router = useRouter()

// ── Per-series chapter data ──
interface SeriesChapterData {
  nodes: LevelNode[]
  loading: boolean
  error: string
}

const seriesChapters = reactive<Record<string, SeriesChapterData>>({})

onMounted(async () => {
  progressStore.hydrate()
  if (seriesStore.series.length === 0 && !seriesStore.loading) {
    await seriesStore.loadSeries()
  }
  if (seriesStore.series.length > 0) {
    await loadAllSeriesChapters()
  }
})

// ── Load root-level chapters for every series in parallel ──
async function loadAllSeriesChapters() {
  const promises = seriesStore.series.map(async (series) => {
    const seriesName = series.name
    if (seriesChapters[seriesName]) {
      return
    }
    seriesChapters[seriesName] = { nodes: [], loading: true, error: '' }
    try {
      const response = await fetchLevel(seriesName, '')
      const chapters = (response.nodes ?? []).filter(
        (n: LevelNode) => n.type === 'chapter'
      )
      seriesChapters[seriesName] = { nodes: chapters, loading: false, error: '' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载失败'
      seriesChapters[seriesName] = { nodes: [], loading: false, error: message }
    }
  })
  await Promise.allSettled(promises)
}

// ── Progress text helper (for series-row cards) ──
function getProgressText(seriesName: string, chapterPathId: string): string {
  const progress = progressStore.getProgress(seriesName, chapterPathId)
  if (!progress) {
    return ''
  }
  if (progress.completed) {
    return '已读完'
  }
  if (progress.currentPage > 0) {
    return `读到 ${progress.currentPage} 页`
  }
  return ''
}

// ── Series accent color (cycle 5 colors by series name hash) ──
const accentColors = ['accent-red', 'accent-orange', 'accent-purple', 'accent-cyan', 'accent-green']

function accentClass(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  return accentColors[Math.abs(hash) % accentColors.length]
}

// ── Navigation ──
function onChapterSelect(seriesName: string, chapter: Record<string, unknown>) {
  const pathId = String(chapter.pathId ?? '')
  router.push(createSeriesReadRoute(seriesName, pathId))
}

function openSeriesAll(seriesName: string) {
  router.push(createSeriesRootRoute(seriesName))
}

function retry() {
  seriesStore.loadSeries().then(() => {
    if (seriesStore.series.length > 0) {
      loadAllSeriesChapters()
    }
  })
}
</script>

<template>
  <main class="min-h-screen bg-[#020617] text-slate-100">
    <!-- ── Background texture ── -->
    <div class="bg-canvas" />

    <!-- ── Sticky header ── -->
    <header
      class="sticky top-0 z-40 border-b border-slate-800/60 bg-[#020617]/85 px-5 py-4 backdrop-blur-md"
    >
      <div>
        <h1 class="text-xl font-bold tracking-tight text-white">📚 漫画架</h1>
        <p class="mt-0.5 text-xs text-slate-500">阅读你的收藏</p>
      </div>
    </header>

    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <!-- ═══ Loading state ═══ -->
      <template v-if="seriesStore.loading">
        <div class="space-y-8">
          <div
            v-for="n in 3"
            :key="n"
            class="space-y-3"
          >
            <div class="shimmer-bg h-5 w-28 rounded" />
            <div class="flex gap-3 overflow-hidden">
              <div
                v-for="m in 5"
                :key="m"
                class="shimmer-bg h-[180px] w-[130px] shrink-0 rounded-lg"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- ═══ Error state ═══ -->
      <div
        v-else-if="seriesStore.error"
        class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-200"
      >
        <p class="mb-4">{{ seriesStore.error }}</p>
        <button
          class="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
          @click="retry"
        >
          重试
        </button>
      </div>

      <!-- ═══ Empty state ═══ -->
      <div
        v-else-if="seriesStore.series.length === 0"
        class="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center"
      >
        <p class="text-4xl">📭</p>
        <p class="mt-3 text-sm text-slate-400">暂无漫画系列</p>
      </div>

      <!-- ═══ Content ═══ -->
      <template v-else>
        <!-- ── Series waterfall rows ── -->
        <div class="space-y-8">
          <section
            v-for="series in seriesStore.series"
            :key="series.pathId"
            class="shelf-row animate-fade-in"
          >
            <!-- Series row header -->
            <div class="mb-3 flex items-center justify-between">
              <h3
                class="series-accent truncate text-base font-semibold text-white"
                :class="accentClass(series.name)"
              >{{ series.name }}</h3>
              <button
                class="shrink-0 text-xs text-sky-400 transition hover:text-sky-300"
                @click="openSeriesAll(series.name)"
              >
                查看全部 ›
              </button>
            </div>

            <!-- Chapter cards horizontal scroll -->
            <div>
              <!-- Loading skeleton for this series -->
              <div
                v-if="seriesChapters[series.name]?.loading"
                class="flex gap-3 overflow-hidden"
              >
                <div
                  v-for="s in 5"
                  :key="s"
                  class="shimmer-bg h-[180px] w-[130px] shrink-0 rounded-lg"
                />
              </div>

              <!-- Error for this series -->
              <p
                v-else-if="seriesChapters[series.name]?.error"
                class="text-xs text-rose-400"
              >
                {{ seriesChapters[series.name].error }}
              </p>

              <!-- Empty chapters -->
              <p
                v-else-if="!seriesChapters[series.name]?.nodes?.length"
                class="text-xs text-slate-500"
              >
                暂无章节
              </p>

              <!-- Chapter cards -->
              <div
                v-else
                class="shelf-scroll scroll-fade-right relative flex gap-3 overflow-x-auto pb-3 -mr-5 pr-5"
              >
                <WaterfallChapterCard
                  v-for="chapter in seriesChapters[series.name].nodes"
                  :key="chapter.pathId"
                  :chapter="{
                    name: chapter.name,
                    path: chapter.path,
                    pathId: chapter.pathId,
                    fileCount: chapter.fileCount,
                    coverUrl: chapter.coverUrl,
                    progressText: getProgressText(series.name, chapter.pathId)
                  }"
                  @select="(ch: Record<string, unknown>) => onChapterSelect(series.name, ch)"
                />
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
/* ── Background texture ── */
.bg-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 60%);
}
.bg-canvas::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
  opacity: 0.4;
}

/* ── Scroll containers ── */
.shelf-scroll {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.shelf-scroll::-webkit-scrollbar {
  display: none;
}

/* ── Scroll fade edge ── */
.scroll-fade-right::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, transparent, #020617);
  pointer-events: none;
  z-index: 2;
}

/* ── Series header accent underline ── */
.series-accent {
  position: relative;
  display: inline-block;
}
.series-accent::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 24px;
  height: 2px;
  border-radius: 2px;
}
.accent-red::after {
  background: #ef4444;
}
.accent-orange::after {
  background: #f97316;
}
.accent-purple::after {
  background: #8b5cf6;
}
.accent-cyan::after {
  background: #06b6d4;
}
.accent-green::after {
  background: #22c55e;
}

/* ── Animations ── */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-fade-in {
  animation: fadeInUp 0.5s ease both;
}

/* ── Staggered row entrance ── */
.shelf-row:nth-child(1) {
  animation-delay: 0.05s;
}
.shelf-row:nth-child(2) {
  animation-delay: 0.12s;
}
.shelf-row:nth-child(3) {
  animation-delay: 0.19s;
}
.shelf-row:nth-child(4) {
  animation-delay: 0.26s;
}
.shelf-row:nth-child(5) {
  animation-delay: 0.33s;
}
.shelf-row:nth-child(6) {
  animation-delay: 0.40s;
}

/* ── Shimmer skeleton ── */
.shimmer-bg {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
</style>
