<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useSeriesStore } from '@/stores/series'
import { useChapterStore } from '@/stores/chapter'
import { useReaderStore } from '@/stores/reader'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import Reader from '@/components/Reader.vue'

const seriesStore = useSeriesStore()
const chapterStore = useChapterStore()
const readerStore = useReaderStore()

// Computed
const isSidebarOpen = computed(() => readerStore.isSidebarOpen)
const isHeaderVisible = computed(() => readerStore.isHeaderVisible)
const isFooterVisible = computed(() => readerStore.isFooterVisible)

// 初始化加载
onMounted(async () => {
  await seriesStore.loadSeries()
  
  if (seriesStore.hasSelectedSeries && seriesStore.currentSeries) {
    await chapterStore.loadChapters(seriesStore.currentSeries)
  }
})

// 处理系列选择
async function handleSeriesSelect(seriesName: string) {
  seriesStore.selectSeries(seriesName)
  await chapterStore.loadChapters(seriesName)
}

// 处理章节选择
async function handleChapterSelect(index: number) {
  // 验证索引有效性
  if (index < 0 || index >= chapterStore.allChapters.length) {
    console.warn('[handleChapterSelect] Invalid chapter index:', index)
    return
  }
  
  chapterStore.selectChapter(index)
  
  // 确保有有效的系列和章节路径
  if (!seriesStore.currentSeries) {
    console.error('[handleChapterSelect] No series selected')
    return
  }
  
  const chapterPath = chapterStore.currentChapterPathId
  if (!chapterPath) {
    console.error('[handleChapterSelect] Invalid chapter path')
    return
  }
  
  await chapterStore.loadChapterFiles(seriesStore.currentSeries, chapterPath)
}

// 切换侧边栏
function toggleSidebar() {
  readerStore.toggleSidebar()
}

// 下一章
async function nextChapter() {
  if (chapterStore.hasMoreChapters) {
    handleChapterSelect(chapterStore.nextChapterIndex)
  }
}

// 上一章
async function prevChapter() {
  if (chapterStore.currentChapterIndex > 0) {
    handleChapterSelect(chapterStore.currentChapterIndex - 1)
  }
}

// 回到顶部
function scrollToTop() {
  const readerEl = document.querySelector('#reader') as HTMLElement | null
  readerEl?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- 切换侧边栏按钮 -->
    <button
      @click="toggleSidebar"
      class="fixed top-4 left-4 z-100 p-3 glass rounded-full shadow-lg"
      style="color: #8b7765;"
    >
      {{ isSidebarOpen ? '✕' : '☰' }}
    </button>

    <!-- 侧边栏 -->
    <Sidebar
      v-show="isSidebarOpen"
      :series-list="seriesStore.seriesList"
      :current-series="seriesStore.currentSeries"
      :chapter-tree="chapterStore.chapterTree"
      :current-chapter-index="chapterStore.currentChapterIndex"
      :is-loading="seriesStore.isLoading || chapterStore.isLoading"
      @select-series="handleSeriesSelect"
      @select-chapter="handleChapterSelect"
      @toggle-volume="chapterStore.toggleVolume"
    />

    <!-- 主内容区 -->
    <div class="main flex-grow flex flex-col overflow-hidden relative">
      <!-- 顶部栏 -->
      <Header
        v-show="isHeaderVisible"
        :series-title="seriesStore.currentSeries || '本地漫画阅读器'"
        :chapter-title="chapterStore.currentChapterName || '未选择章节'"
        :scale="readerStore.scale"
        :prev-disabled="chapterStore.currentChapterIndex <= 0"
        :next-disabled="!chapterStore.hasMoreChapters"
        @update-scale="readerStore.setScale"
        @prev-chapter="prevChapter"
        @next-chapter="nextChapter"
        @scroll-top="scrollToTop"
      />

      <!-- 阅读器 -->
      <Reader
        :series-name="seriesStore.currentSeries"
        :chapter-path="chapterStore.currentChapterPathId"
        :files="chapterStore.chapterFiles"
        :current-chapter-index="chapterStore.currentChapterIndex"
        :scale="readerStore.scale"
      />

      <!-- 底部栏 -->
      <Footer
        v-show="isFooterVisible"
        :progress-text="readerStore.briefProgressText"
        :full-progress-text="readerStore.progressText"
        :loaded-pages="readerStore.progress.loadedPages"
        :total-pages="readerStore.progress.totalPages"
        @show-jump-modal="readerStore.isSidebarOpen = true"
      />
    </div>
  </div>
</template>

<style scoped>
.main {
  position: fixed;
  inset: 0;
  z-index: 10;
  margin: 0;
}
</style>
