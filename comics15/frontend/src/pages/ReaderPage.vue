<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReaderMediaItem from '../components/ReaderMediaItem.vue'
import ReaderShell from '../components/ReaderShell.vue'
import { createParentDirectoryRoute, createSeriesReadRoute } from '../router/index.js'
import { useReaderStore } from '../stores/reader-store.js'

const readerStore = useReaderStore()
const route = useRoute()
const router = useRouter()

const seriesName = computed(() => String(route.params.series ?? ''))
const chapterPath = computed(() => {
  const pathMatch = route.params.pathMatch

  return Array.isArray(pathMatch) ? pathMatch.join('/') : String(pathMatch ?? '')
})

const pageElements = ref([])
const activePageIndexes = ref(new Set())
let pageObserver = null

onMounted(() => {
  readerStore.loadChapter(seriesName.value, chapterPath.value)
})

watch([seriesName, chapterPath], ([nextSeriesName, nextChapterPath], [previousSeriesName, previousChapterPath]) => {
  if (nextSeriesName === previousSeriesName && nextChapterPath === previousChapterPath) {
    return
  }

  cleanupPageTracking()
  readerStore.loadChapter(nextSeriesName, nextChapterPath)
})

onBeforeUnmount(() => {
  cleanupPageTracking()
})

function setPageRef(element, index) {
  if (element) {
    pageElements.value[index] = element
  }
}

function cleanupPageTracking() {
  pageObserver?.disconnect()
  pageObserver = null
  pageElements.value = []
  activePageIndexes.value = new Set()
}

function updateActiveWindow(page) {
  const currentIndex = Math.max(page - 1, 0)
  const nextActiveIndexes = new Set()
  const start = Math.max(currentIndex - 1, 0)
  const end = Math.min(currentIndex + 2, Math.max(readerStore.mediaItems.length - 1, 0))

  for (let index = start; index <= end; index += 1) {
    nextActiveIndexes.add(index)
  }

  activePageIndexes.value = nextActiveIndexes
}

function isPageActive(index) {
  if (activePageIndexes.value.size === 0 && readerStore.mediaItems.length > 0) {
    const currentIndex = Math.max(readerStore.currentPage - 1, 0)
    const start = Math.max(currentIndex - 1, 0)
    const end = Math.min(currentIndex + 2, readerStore.mediaItems.length - 1)

    return index >= start && index <= end
  }

  return activePageIndexes.value.has(index)
}

async function initPageObserver() {
  await nextTick()
  pageObserver?.disconnect()

  if (!pageElements.value.length) {
    return
  }

  if (!globalThis.IntersectionObserver) {
    readerStore.setCurrentPage(1)
    updateActiveWindow(1)
    return
  }

  pageObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter((entry) => entry.isIntersecting)

    if (visibleEntries.length === 0) {
      return
    }

    const closest = visibleEntries.sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
    const index = Number(closest.target.dataset.pageIndex ?? '0')
    readerStore.setCurrentPage(index + 1)
    updateActiveWindow(index + 1)
  }, {
    rootMargin: '0px',
    threshold: [0.25, 0.5, 0.75]
  })

  pageElements.value.forEach((element) => pageObserver.observe(element))
  if (readerStore.currentPage > 0) {
    updateActiveWindow(readerStore.currentPage)
  }
}

watch(() => readerStore.mediaItems, () => {
  cleanupPageTracking()
  initPageObserver()
}, { deep: true, immediate: true })

function jumpToPage(page) {
  readerStore.setCurrentPage(page)
  updateActiveWindow(page)
  const target = document.querySelector(`[data-page-index="${page - 1}"]`)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goBackToDirectory() {
  router.push(createParentDirectoryRoute(seriesName.value, chapterPath.value))
}

function goToChapter(path) {
  if (path) {
    router.push(createSeriesReadRoute(seriesName.value, path))
  }
}

defineExpose({
  pageElementsLengthForTest: () => pageElements.value.length
})
</script>

<template>
  <main class="min-h-screen bg-black pb-24 text-slate-100">
    <div v-if="readerStore.loading" class="flex min-h-screen items-center justify-center text-sm text-slate-400">
      加载中…
    </div>

    <div v-else-if="readerStore.error" class="flex min-h-screen items-center justify-center px-6 text-center text-sm text-rose-200">
      {{ readerStore.error }}
    </div>

    <section v-else class="mx-auto flex flex-col">
      <div
        v-for="(media, index) in readerStore.mediaItems"
        :key="media.url ?? media.hqUrl ?? media.videoUrl ?? index"
        :data-page-index="index"
        :ref="(element) => setPageRef(element, index)"
      >
        <ReaderMediaItem :media="media" :index="index" :active="isPageActive(index)" />
      </div>
    </section>

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
  </main>
</template>
