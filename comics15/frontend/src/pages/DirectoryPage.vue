<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChapterCard from '../components/ChapterCard.vue'
import { createParentDirectoryRoute, createSeriesDirectoryRoute, createSeriesReadRoute } from '../router/index.js'
import { useChapterStore } from '../stores/chapter-store.js'
import { useProgressStore } from '../stores/progress-store.js'
import { useReaderStore } from '../stores/reader-store.js'

const chapterStore = useChapterStore()
const progressStore = useProgressStore()
const readerStore = useReaderStore()
const route = useRoute()
const router = useRouter()

const seriesName = computed(() => String(route.params.series ?? ''))
const currentPath = computed(() => {
  const pathMatch = route.params.pathMatch

  return Array.isArray(pathMatch) ? pathMatch.join('/') : String(pathMatch ?? '')
})
const visibleNodes = computed(() => {
  const nodes = chapterStore.nodes ?? []

  if (nodes.length > 0) {
    return nodes
  }

  return [...(chapterStore.directories ?? []), ...(chapterStore.chapters ?? [])]
})

onMounted(() => {
  chapterStore.loadLevel(seriesName.value, currentPath.value)
})

watch([seriesName, currentPath], ([nextSeriesName, nextPath], [previousSeriesName, previousPath]) => {
  if (nextSeriesName === previousSeriesName && nextPath === previousPath) {
    return
  }

  chapterStore.loadLevel(nextSeriesName, nextPath)
})

function getProgressText(chapterPathId) {
  const progress = progressStore.getProgress(seriesName.value, chapterPathId)

  if (!progress) {
    return '未读'
  }

  if (progress.completed) {
    return '已读完'
  }

  if (progress.currentPage > 1) {
    return `读到 ${progress.currentPage} 页`
  }

  return '未读'
}

function openDirectory(directory) {
  router.push(createSeriesDirectoryRoute(seriesName.value, directory.path))
}

function openChapter(chapter) {
  const chapterNodes = (chapterStore.nodes ?? []).filter((node) => node.type === 'chapter')
  const chapterIndex = chapterNodes.findIndex((node) => node.path_id === chapter.path_id)
  const previousChapter = chapterIndex > 0 ? chapterNodes[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapterNodes.length - 1 ? chapterNodes[chapterIndex + 1] : null

  chapterStore.setLastReadChapterPath(seriesName.value, chapter.path_id)
  readerStore.setChapterContext({
    previousChapterPath: previousChapter?.path_id ?? '',
    nextChapterPath: nextChapter?.path_id ?? '',
    chapterPaths: chapterNodes.map((node) => node.path_id)
  })
  router.push(createSeriesReadRoute(seriesName.value, chapter.path_id))
}

function goBack() {
  router.push(createParentDirectoryRoute(seriesName.value, currentPath.value))
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <section class="mx-auto flex max-w-6xl flex-col gap-6">
      <header class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.4em] text-sky-400">Comic Reader</p>
          <h1 class="text-2xl font-semibold text-white sm:text-3xl">目录浏览</h1>
        </div>
        <button class="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200" @click="goBack">
          返回上一级
        </button>
      </header>

      <div v-if="chapterStore.loading" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-inner">
        加载中…
      </div>

      <div v-else-if="chapterStore.error" class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-200 shadow-inner">
        {{ chapterStore.error }}
      </div>

      <div v-else-if="visibleNodes.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-inner">
        暂无内容
      </div>

      <div v-else class="space-y-6">
        <ul class="space-y-3">
          <li v-for="node in visibleNodes" :key="node.path ?? node.path_id">
            <button
              v-if="node.type === 'directory'"
              class="directory-node flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-left transition hover:border-sky-500"
              @click="openDirectory(node)"
            >
              <div>
                <div class="font-medium text-white">{{ node.name }}</div>
                <div class="text-xs text-slate-400">可继续展开</div>
              </div>
              <span class="text-sky-400">›</span>
            </button>

            <ChapterCard
              v-else
              :chapter="{
                name: node.name,
                totalFiles: Number(node.total_files ?? node.totalFiles ?? 0),
                progressText: getProgressText(node.path_id),
                coverUrl: node.cover_url ?? node.coverUrl,
                pathText: node.path_id.replace(new RegExp(`^${seriesName}\\/?`), '')
              }"
              :active="(chapterStore.lastReadChapterPathBySeries ?? {})[seriesName] === node.path_id"
              @select="openChapter(node)"
            />
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>
