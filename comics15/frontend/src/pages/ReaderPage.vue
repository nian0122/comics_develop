<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import ReaderMediaItem from '@/components/ReaderMediaItem.vue'
import ReaderShell from '@/components/ReaderShell.vue'
import { createParentDirectoryRoute, createSeriesReadRoute } from '@/router'
import { useReaderStore } from '@/stores/reader-store'
import { useProgressStore } from '@/stores/progress-store'
import { preloadEngine } from '@/utils/preload-engine'

const readerStore = useReaderStore()
const progressStore = useProgressStore()
const route = useRoute()
const router = useRouter()

const seriesName = computed(() => String(route.params.series ?? ''))
const chapterPath = computed(() => {
  const pathMatch = route.params.pathMatch
  return Array.isArray(pathMatch) ? pathMatch.join('/') : String(pathMatch ?? '')
})

const scrollerRef = ref<{ scrollToItem: (index: number) => void } | null>(null)
const mainRef = ref<HTMLElement | null>(null)

let pageObserver: IntersectionObserver | null = null
const visibilityByIndex = new Map<number, number>()

onMounted(() => {
  preloadEngine.setUrlResolver((index: number) => readerStore.mediaItems[index]?.url ?? null)
  readerStore.loadChapter(seriesName.value, chapterPath.value)
})

watch([seriesName, chapterPath], ([nextSeriesName, nextChapterPath], [previousSeriesName, previousChapterPath]) => {
  if (nextSeriesName === previousSeriesName && nextChapterPath === previousChapterPath) {
    return
  }
  preloadEngine.reset(0)
  readerStore.loadChapter(nextSeriesName, nextChapterPath)
})

onBeforeUnmount(() => {
  pageObserver?.disconnect()
  preloadEngine.reset(0)
})

// 翻页时自动保存阅读进度到 localStorage
watch(() => readerStore.currentPage, (page) => {
  if (page > 0 && readerStore.totalPages > 0) {
    progressStore.setProgress(seriesName.value, chapterPath.value, {
      currentPage: page,
      completed: page >= readerStore.totalPages
    })
  }
})

watch(() => readerStore.mediaItems, async (items) => {
  if (items.length === 0) return
  await nextTick()
  setupPageObserver()

  // 自动恢复上次的阅读页码
  const saved = progressStore.getProgress(seriesName.value, chapterPath.value)
  if (saved && !saved.completed && saved.currentPage > 1) {
    jumpToPage(Math.min(saved.currentPage, readerStore.totalPages))
  }
})

async function onScrollerVisible() {
  await nextTick()
  setupPageObserver()
}

function setupPageObserver() {
  pageObserver?.disconnect()
  visibilityByIndex.clear()

  if (!globalThis.IntersectionObserver) {
    readerStore.setCurrentPage(1)
    return
  }

  const items = mainRef.value?.querySelectorAll('[data-index]')
  if (!items || items.length === 0) return

  pageObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const index = Number((entry.target as HTMLElement).dataset.index ?? '0')
      if (entry.isIntersecting) {
        visibilityByIndex.set(index, entry.intersectionRatio)
      } else {
        visibilityByIndex.delete(index)
      }
    }

    let bestIndex = -1
    let bestRatio = 0

    for (const [index, ratio] of visibilityByIndex) {
      if (ratio > bestRatio) {
        bestIndex = index
        bestRatio = ratio
      }
    }

    if (bestIndex >= 0) {
      readerStore.setCurrentPage(bestIndex + 1)
      const visibleStart = Math.max(0, bestIndex - 2)
      const visibleEnd = Math.min(bestIndex + 2, readerStore.totalPages - 1)
      preloadEngine.onVisibleChange(visibleStart, visibleEnd, readerStore.totalPages)
    }
  }, { threshold: [0, 0.25, 0.5, 0.75] })

  for (const item of items) {
    pageObserver.observe(item)
  }
}

function jumpToPage(page: number) {
  readerStore.setCurrentPage(page)
  scrollerRef.value?.scrollToItem(page - 1)
}

function goBackToDirectory() {
  router.push(createParentDirectoryRoute(seriesName.value, chapterPath.value))
}

function goToChapter(path: string) {
  if (path) {
    router.push(createSeriesReadRoute(seriesName.value, path))
  }
}
</script>

<template>
  <main ref="mainRef" class="h-dvh bg-black text-slate-100 flex flex-col">
    <div
      v-if="readerStore.loading"
      class="flex min-h-dvh items-center justify-center text-sm text-slate-400"
    >
      加载中…
    </div>

    <div
      v-else-if="readerStore.error"
      class="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-rose-200"
    >
      {{ readerStore.error }}
    </div>

    <template v-else>
      <DynamicScroller
        ref="scrollerRef"
        :items="readerStore.mediaItems"
        :min-item-size="400"
        key-field="url"
        class="flex-1 pb-24"
        @visible="onScrollerVisible"
      >
        <template #default="{ item, index, active }">
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :data-index="index"
            class="mx-auto"
          >
            <ReaderMediaItem
              :url="item.url"
              :fallback-url="item.fallbackUrl"
              :alt="item.name"
              :kind="item.type"
            />
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>

      <ReaderShell
        :current-page="readerStore.currentPage"
        :total-pages="readerStore.totalPages"
        :previous-disabled="!readerStore.previousChapterPath"
        :next-disabled="!readerStore.nextChapterPath"
        @jump="jumpToPage"
        @back="goBackToDirectory"
        @previous="goToChapter(readerStore.previousChapterPath)"
        @next="goToChapter(readerStore.nextChapterPath)"
      />
    </template>
  </main>
</template>
