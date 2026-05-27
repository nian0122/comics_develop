<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import ReaderMediaItem from '@/components/ReaderMediaItem.vue'
import ReaderShell from '@/components/ReaderShell.vue'
import { createParentDirectoryRoute, createSeriesReadRoute } from '@/router'
import { useReaderStore } from '@/stores/reader-store'
import { preloadEngine } from '@/utils/preload-engine'

const readerStore = useReaderStore()
const route = useRoute()
const router = useRouter()

const seriesName = computed(() => String(route.params.series ?? ''))
const chapterPath = computed(() => {
  const pathMatch = route.params.pathMatch
  return Array.isArray(pathMatch) ? pathMatch.join('/') : String(pathMatch ?? '')
})

const scrollerRef = ref<{ scrollToItem: (index: number) => void } | null>(null)

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
  preloadEngine.reset(0)
})

function onScrollerUpdate(
  _startIndex: number,
  _endIndex: number,
  visibleStartIndex: number,
  visibleEndIndex: number
) {
  readerStore.setCurrentPage(visibleStartIndex + 1)
  preloadEngine.onVisibleChange(visibleStartIndex, visibleEndIndex, readerStore.totalPages)
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
  <main class="h-dvh bg-black text-slate-100 flex flex-col">
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

    <DynamicScroller
      v-else
      ref="scrollerRef"
      :items="readerStore.mediaItems"
      :min-item-size="400"
      key-field="url"
      class="flex-1 pb-24"
      @update="onScrollerUpdate"
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
  </main>
</template>
