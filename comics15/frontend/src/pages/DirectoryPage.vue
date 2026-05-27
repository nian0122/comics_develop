<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChapterCard from '@/components/ChapterCard.vue'
import { createParentDirectoryRoute, createSeriesDirectoryRoute, createSeriesReadRoute } from '@/router'
import { useChapterStore } from '@/stores/chapter-store'
import { useProgressStore } from '@/stores/progress-store'
import { useReaderStore } from '@/stores/reader-store'
import type { LevelNode } from '@/types/api'

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

onMounted(() => {
  chapterStore.loadLevel(seriesName.value, currentPath.value)
})

watch([seriesName, currentPath], ([nextSeriesName, nextPath], [previousSeriesName, previousPath]) => {
  if (nextSeriesName === previousSeriesName && nextPath === previousPath) {
    return
  }

  chapterStore.loadLevel(nextSeriesName, nextPath)
})

function getProgressText(chapterPathId: string): string {
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

function openDirectory(directory: LevelNode) {
  router.push(createSeriesDirectoryRoute(seriesName.value, directory.path))
}

function openChapter(chapter: Record<string, unknown>) {
  const chapterNodes = (chapterStore.nodes ?? []).filter((node) => node.type === 'chapter')
  const pathId = String(chapter.pathId ?? '')
  const chapterIndex = chapterNodes.findIndex((node) => node.pathId === pathId)
  const previousChapter = chapterIndex > 0 ? chapterNodes[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapterNodes.length - 1 ? chapterNodes[chapterIndex + 1] : null

  chapterStore.setLastReadChapterPath(seriesName.value, pathId)
  readerStore.setChapterContext({
    previousChapterPath: previousChapter?.pathId ?? '',
    nextChapterPath: nextChapter?.pathId ?? '',
    chapterPaths: chapterNodes.map((node) => node.pathId)
  })
  router.push(createSeriesReadRoute(seriesName.value, pathId))
}

function navigateUp() {
  chapterStore.setLastDirectoryPath(seriesName.value, currentPath.value)
  router.push(createParentDirectoryRoute(seriesName.value, currentPath.value))
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <section class="mx-auto max-w-5xl">
      <header class="mb-6 flex items-center gap-3">
        <button class="text-sky-400 text-sm hover:text-sky-300" @click="navigateUp">← 返回</button>
        <h1 class="text-xl font-medium text-white truncate">{{ seriesName }}</h1>
      </header>

      <div v-if="chapterStore.loading" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
        加载中…
      </div>

      <div v-else-if="chapterStore.error" class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-200">
        {{ chapterStore.error }}
      </div>

      <div v-else class="space-y-4">
        <template v-for="node in chapterStore.nodes" :key="node.pathId">
          <button
            v-if="node.type === 'directory'"
            class="flex w-full items-center rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-left text-slate-200 transition hover:border-sky-500"
            @click="openDirectory(node)"
          >
            <span class="mr-3 text-sky-400">📁</span>
            <span class="flex-1 truncate">{{ node.name }}</span>
            <span class="ml-2 shrink-0 text-sm text-slate-500">→</span>
          </button>

          <ChapterCard
            v-else-if="node.type === 'chapter'"
            :chapter="{
              name: node.name,
              path: node.path,
              pathId: node.pathId,
              fileCount: node.fileCount,
              coverUrl: node.coverUrl,
              pathText: node.pathId,
              progressText: getProgressText(node.pathId)
            }"
            @select="openChapter"
          />
        </template>

        <div v-if="chapterStore.nodes.length === 0 && !chapterStore.loading" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400">
          此目录为空
        </div>
      </div>
    </section>
  </main>
</template>
