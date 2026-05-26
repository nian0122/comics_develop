<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ChapterCard from '@/components/ChapterCard.vue'
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

// ── 继续阅读 items ──
interface ContinueItem {
  seriesName: string
  chapterPathId: string
  progressText: string
  currentPage: number
  chapterName: string
  coverUrl: string | undefined
}

const continueItems = ref<ContinueItem[]>([])

onMounted(async () => {
  progressStore.hydrate()
  if (seriesStore.series.length === 0 && !seriesStore.loading) {
    await seriesStore.loadSeries()
  }
  if (seriesStore.series.length > 0) {
    await loadAllSeriesChapters()
    buildContinueReading()
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

// ── Parse progress key "seriesName::chapterPathId" ──
function parseProgressKey(key: string): { seriesName: string; chapterPathId: string } | null {
  const idx = key.indexOf('::')
  if (idx === -1) {
    return null
  }
  return { seriesName: key.slice(0, idx), chapterPathId: key.slice(idx + 2) }
}

// ── Build 继续阅读 from all progress entries ──
function buildContinueReading() {
  const items: ContinueItem[] = []
  for (const [key, progress] of Object.entries(progressStore.items)) {
    if (progress.completed) {
      continue
    }
    const parsed = parseProgressKey(key)
    if (!parsed) {
      continue
    }
    const { seriesName, chapterPathId } = parsed
    const chapData = seriesChapters[seriesName]?.nodes
    const chapter = chapData?.find((n) => n.pathId === chapterPathId)

    items.push({
      seriesName,
      chapterPathId,
      progressText: `读到 ${progress.currentPage} 页`,
      currentPage: progress.currentPage,
      chapterName: chapter?.name ?? chapterPathId,
      coverUrl: chapter?.coverUrl
    })
  }
  continueItems.value = items
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

// ── Navigation ──
function onChapterSelect(seriesName: string, chapter: Record<string, unknown>) {
  const pathId = String(chapter.pathId ?? '')
  router.push(createSeriesReadRoute(seriesName, pathId))
}

function onContinueSelect(item: ContinueItem) {
  router.push(createSeriesReadRoute(item.seriesName, item.chapterPathId))
}

function openSeriesAll(seriesName: string) {
  router.push(createSeriesRootRoute(seriesName))
}

function goToRecent() {
  // Scroll to 继续阅读 section
  const el = document.getElementById('section-continue')
  el?.scrollIntoView({ behavior: 'smooth' })
}

function goToTools() {
  router.push('/tools')
}

function retry() {
  seriesStore.loadSeries().then(() => {
    if (seriesStore.series.length > 0) {
      loadAllSeriesChapters().then(buildContinueReading)
    }
  })
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 pb-20 text-slate-100">
    <!-- ── Sticky header ── -->
    <header
      class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 px-4 py-3 backdrop-blur-md sm:px-6"
    >
      <div class="mx-auto flex max-w-5xl items-center justify-between">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white">📚 漫画架</h1>
          <p class="mt-0.5 text-xs text-slate-400">本地漫画阅读器</p>
        </div>
        <button
          class="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="搜索"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </button>
      </div>
    </header>

    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <!-- ═══ Loading state ═══ -->
      <template v-if="seriesStore.loading">
        <div class="space-y-8">
          <div
            v-for="n in 3"
            :key="n"
            class="animate-pulse space-y-4"
          >
            <div class="h-5 w-32 rounded bg-slate-800"></div>
            <div class="flex gap-3 overflow-hidden">
              <div
                v-for="m in 5"
                :key="m"
                class="h-32 w-44 shrink-0 rounded-2xl bg-slate-800"
              ></div>
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
        <!-- ── 继续阅读 ── -->
        <section
          v-if="continueItems.length > 0"
          id="section-continue"
          class="mb-8"
        >
          <h2
            class="mb-3 flex items-center gap-2 text-base font-semibold text-white"
          >
            <span class="text-sky-400">📖</span> 继续阅读
          </h2>
          <div
            class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
            style="scrollbar-width: none"
          >
            <button
              v-for="item in continueItems"
              :key="`${item.seriesName}::${item.chapterPathId}`"
              class="flex w-64 shrink-0 snap-start items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left transition hover:border-sky-500"
              @click="onContinueSelect(item)"
            >
              <!-- Cover -->
              <div class="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                <img
                  v-if="item.coverUrl"
                  :src="item.coverUrl"
                  :alt="item.chapterName"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  v-else
                  class="flex h-full items-center justify-center text-xs text-slate-500"
                >
                  无
                </div>
              </div>
              <!-- Info -->
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs text-slate-400">{{ item.seriesName }}</p>
                <p class="truncate text-sm font-medium text-white">{{ item.chapterName }}</p>
                <p class="mt-0.5 text-xs text-sky-400">{{ item.progressText }}</p>
                <!-- Progress bar -->
                <div class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    class="h-full rounded-full bg-sky-500 transition-all"
                    :style="{ width: Math.min(100, (item.currentPage / Math.max(1, item.currentPage + 5)) * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </button>
          </div>
        </section>

        <!-- ── Series waterfall rows ── -->
        <div class="space-y-10">
          <section
            v-for="series in seriesStore.series"
            :key="series.pathId"
          >
            <!-- Series row header -->
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-baseline gap-2 min-w-0">
                <h3 class="truncate text-base font-semibold text-white">{{
                  series.name
                }}</h3>
              </div>
              <button
                class="shrink-0 text-xs text-sky-400 transition hover:text-sky-300"
                @click="openSeriesAll(series.name)"
              >
                查看全部 &rsaquo;
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
                  class="h-28 w-44 shrink-0 animate-pulse rounded-2xl bg-slate-800"
                ></div>
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
                class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
                style="scrollbar-width: none"
              >
                <ChapterCard
                  v-for="chapter in seriesChapters[series.name].nodes"
                  :key="chapter.pathId"
                  :chapter="{
                    name: chapter.name,
                    type: chapter.type,
                    path: chapter.path,
                    pathId: chapter.pathId,
                    fileCount: chapter.fileCount,
                    coverUrl: chapter.coverUrl,
                    progressText: getProgressText(series.name, chapter.pathId)
                  }"
                  class="w-48 shrink-0 snap-start"
                  @select="(ch: Record<string, unknown>) => onChapterSelect(series.name, ch)"
                />
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>

    <!-- ═══ Bottom navigation bar ═══ -->
    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/85 backdrop-blur-md"
    >
      <div class="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        <button
          class="flex flex-col items-center gap-0.5 px-4 py-1 text-sky-400"
          aria-current="page"
        >
          <span class="text-lg">📚</span>
          <span class="text-xs font-medium">系列</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 transition hover:text-white"
          @click="goToRecent"
        >
          <span class="text-lg">📖</span>
          <span class="text-xs font-medium">最近</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 transition hover:text-white"
          @click="goToTools"
        >
          <span class="text-lg">🔧</span>
          <span class="text-xs font-medium">工具</span>
        </button>
      </div>
    </nav>
  </main>
</template>
