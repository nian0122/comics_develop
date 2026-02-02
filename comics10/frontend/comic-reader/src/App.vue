<!--
  - 预加载容器
  - 侧边栏
  - 主内容区 (Header + Reader + Footer)
  - 初始化及恢复状态 (restoreReadingPosition)
-->

<template>
  <div class="flex h-screen overflow-hidden bg-dark-bg-primary text-dark-text-primary" style="background-color: var(--bg-primary); color: var(--text-primary);">
    <!-- 预加载容器 -->
    <div id="preloader-container" ref="preloaderRef"></div>

    <!-- 移动端侧边栏切换按钮 -->
    <button
        class="toggle-sidebar-btn fixed top-4 left-4 z-50 p-2 bg-dark-accent-primary hover:bg-dark-accent-hover text-white rounded-full shadow-soft transition-all duration-200 md:hidden"
        @click="toggleSidebar"
        style="background-color: var(--accent-primary); color: white;"
    >
      {{ sidebarVisible ? '✕' : '☰' }}
    </button>

    <!-- 侧边栏 -->
    <Sidebar
        id="sidebar"
        :series="series || []"
        :chapter-tree="chapterTree || []"
        :current-series="currentSeries || ''"
        :current-index="currentIndex || -1"
        :filter-text="filterText || ''"
        :expanded-paths="expandedPaths || {}"
        :sidebar-visible="sidebarVisible || false"
        :is-mobile="isMobile || false"
        @select-series="handleSelectSeries"
        @select-chapter="handleSelectChapter"
        @update:filter-text="filterText = $event"
        @toggle-volume="handleToggleVolume"
    />

    <!-- 主内容区 -->
    <div class="main-content flex-grow flex flex-col overflow-hidden" style="background-color: var(--bg-secondary);">
      <!-- 顶部工具栏 -->
      <HeaderBar
          :series-title="currentSeries || '本地漫画阅读器'"
          :chapter-title="currentChapterTitle"
          :scale="scale || 100"
          :can-prev="canPrev || false"
          :can-next="canNext || false"
          :header-visible="headerVisible || false"
          @prev-chapter="handlePrevChapter"
          @next-chapter="handleNextChapter"
          @scroll-top="handleScrollTop"
          @update:scale="handleScaleChange"
      />

      <!-- 阅读区域 -->
      <Reader
          ref="readerRef"
          :files="allChapterFiles || []"
          :loaded-count="imagesLoadedCount || 0"
          :scale="scale || 100"
          :has-chapter="currentIndex !== undefined && currentIndex >= 0"
          :series="currentSeries || ''"
          :chapter="getCurrentChapterPathId()"
          @scroll="handleReaderScroll"
          @load-more="handleLoadMore"
          @image-double-click="handleImageDoubleClick"
      />

      <!-- 底部状态栏 -->
      <FooterBar
          :status="statusText"
          :loaded-count="imagesLoadedCount || 0"
          :total-count="(allChapterFiles || []).length"
          :footer-visible="footerVisible || false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted} from 'vue';
import Sidebar from './components/Sidebar.vue';
import HeaderBar from './components/HeaderBar.vue';
import FooterBar from './components/FooterBar.vue';
import Reader from './components/Reader.vue';
import {useSeries} from './composables/useSeries';
import {useChapters} from './composables/useChapters';
import {useReader} from './composables/useReader';
import {usePreload} from './composables/usePreload';
import {useUIState} from './composables/useUIState';

// ============== UI 状态管理 ==============
const {
  headerVisible,
  footerVisible,
  sidebarVisible,
  isMobile,
  toggleSidebar,
  handleScroll: handleUIScroll,
  updateSidebarState,
} = useUIState();

// ============== 系列管理 ==============
const {
  series,
  currentSeries,
  loading: seriesLoading,
  error: seriesError,
  loadSeries,
  selectSeries,
} = useSeries();

// ============== 章节管理 ==============
const {
  flatChapters,
  chapterTree,
  filterText,
  expandedPaths,
  buildTree,
  toggleVolume,
  loadChapters,
} = useChapters();

// ============== 阅读器管理 ==============
const {
  allChapterFiles,
  imagesLoadedCount,
  currentIndex,
  scale,
  isLoading: readerLoading,
  openChapter,
  appendNextImages,
  resetLoadingState,
  updateScale,
  canPrev,
  canNext,
} = useReader();

// ============== 预加载管理 ==============
const {
  preloadNextBatch,
  preloadNextChapterMeta,
  setPreloaderContainer,
} = usePreload();

// ============== DOM 引用 ==============
const readerRef = ref<InstanceType<typeof Reader> | null>(null);
const preloaderRef = ref<HTMLDivElement | null>(null);

// ============== 计算属性 ==============
const currentChapterTitle = computed(() => {
  if (currentIndex.value === undefined || currentIndex.value < 0) return '未选择章节';
  if (!flatChapters.value) return '未选择章节';
  const chapter = flatChapters.value[currentIndex.value];
  return chapter ? chapter.name : '未选择章节';
});

const statusText = computed(() => {
  if (seriesLoading.value) return '正在加载系列...';
  if (seriesError.value) return `错误: ${seriesError.value}`;
  if (readerLoading.value) return '加载中...';
  if (currentIndex.value !== undefined && currentIndex.value >= 0 && allChapterFiles.value) {
    return `章节加载完成。共 ${allChapterFiles.value.length} 个文件`;
  }
  return '状态：未加载';
});

// 获取当前章节的path_id
function getCurrentChapterPathId(): string {
  if (currentIndex.value === undefined || currentIndex.value < 0 || !flatChapters.value) {
    return '';
  }
  const chapter = flatChapters.value[currentIndex.value];
  return chapter ? chapter.path_id : '';
}

// ============== 事件处理 ==============

// 选择系列
async function handleSelectSeries(name: string) {
  if (currentSeries.value === name) return;

  await selectSeries(name);
  const chapters = await loadChapters(name);

  if (chapters) {
    buildTree(chapters);
    resetLoadingState();
  }

  // 移动端自动关闭侧边栏
  if (isMobile.value && sidebarVisible.value) {
    toggleSidebar();
  }
}

// 选择章节
async function handleSelectChapter(index: number) {
  if (!flatChapters.value) return;
  await openChapter(index, flatChapters.value, currentSeries.value || '');

  // 预加载下一章元数据
  if (currentSeries.value && currentIndex.value !== undefined) {
    await preloadNextChapterMeta(
        currentIndex.value,
        flatChapters.value,
        currentSeries.value
    );
  }

  // 移动端自动关闭侧边栏
  if (isMobile.value && sidebarVisible.value) {
    toggleSidebar();
  }

  // 保存阅读位置
  const chapter = flatChapters.value[index];
  if (chapter) {
    localStorage.setItem('currentChapterPathId', chapter.path_id);
  }
}

// 切换卷展开/折叠
function handleToggleVolume(fullPath: string) {
  if (!chapterTree.value) return;
  toggleVolume(fullPath, chapterTree.value);
}

// 上一章
function handlePrevChapter() {
  if (currentIndex.value !== undefined && currentIndex.value > 0) {
    handleSelectChapter(currentIndex.value - 1);
  }
}

// 下一章
function handleNextChapter() {
  if (currentIndex.value !== undefined && flatChapters.value && currentIndex.value < flatChapters.value.length - 1) {
    handleSelectChapter(currentIndex.value + 1);
  }
}

// 回到顶部
function handleScrollTop() {
  readerRef.value?.scrollToTop();
}

// 缩放变化
function handleScaleChange(value: number) {
  updateScale(value);
}

// 阅读器滚动处理
function handleReaderScroll(data: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
  handleUIScroll(data.scrollTop, data.scrollHeight, data.clientHeight);
}

// 加载更多
function handleLoadMore() {
  if (currentSeries.value && flatChapters.value && currentIndex.value !== undefined) {
    appendNextImages(currentSeries.value, flatChapters.value[currentIndex.value]?.path_id || '');

    // 触发预加载
    if (currentSeries.value && currentIndex.value >= 0) {
      preloadNextBatch(
        imagesLoadedCount.value || 0,
        currentSeries.value,
        flatChapters.value[currentIndex.value]?.path_id || '',
        allChapterFiles.value || []
      );
    }
  }
}

// 图片双击切换 HQ
function handleImageDoubleClick(imgElement: HTMLImageElement) {
  const originalSrc = imgElement.src;

  // 检查是否已经是 HQ 图片
  if (originalSrc.includes('/hq_image/')) return;

  // 切换到 HQ 路径
  const hqSrc = originalSrc.replace('/image/', '/hq_image/');

  imgElement.style.pointerEvents = 'none';
  imgElement.src = hqSrc;

  imgElement.onload = () => {
    imgElement.style.pointerEvents = 'auto';
  };

  imgElement.onerror = () => {
    imgElement.style.pointerEvents = 'auto';
    imgElement.src = originalSrc;
  };
}

// ============== 键盘事件 ==============
function handleKeyDown(e: KeyboardEvent) {
  // 如果焦点在输入框，不处理
  if (e.target instanceof HTMLInputElement) return;

  switch (e.key) {
    case 'ArrowLeft':
      handlePrevChapter();
      e.preventDefault();
      break;
    case 'ArrowRight':
      handleNextChapter();
      e.preventDefault();
      break;
    case 'Home':
      handleScrollTop();
      e.preventDefault();
      break;
    case 'PageDown':
      readerRef.value?.scrollByPage(0.9);
      e.preventDefault();
      break;
    case 'PageUp':
      readerRef.value?.scrollByPage(-0.9);
      e.preventDefault();
      break;
  }
}

// ============== 初始化及恢复状态 ==============
async function restoreReadingPosition() {
  const savedSeries = localStorage.getItem('currentSeries');
  const savedChapterPathId = localStorage.getItem('currentChapterPathId');

  await loadSeries();

  if (savedSeries && series.value && series.value.includes(savedSeries)) {
    await handleSelectSeries(savedSeries);

    if (savedChapterPathId && flatChapters.value && flatChapters.value.length > 0) {
      const savedIndex = flatChapters.value.findIndex(
          (item) => item.path_id === savedChapterPathId
      );

      if (savedIndex !== -1) {
        await handleSelectChapter(savedIndex);
      }
    }
  } else if (series.value && series.value.length > 0) {
    await handleSelectSeries(series.value[0]);
  }
}

// ============== 生命周期 ==============
onMounted(() => {
  // 设置预加载容器
  if (preloaderRef.value) {
    setPreloaderContainer(preloaderRef.value);
  }

  // 初始化侧边栏状态
  updateSidebarState();
  window.addEventListener('resize', updateSidebarState);

  // 监听键盘事件
  document.addEventListener('keydown', handleKeyDown);

  // 恢复阅读位置
  restoreReadingPosition();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateSidebarState);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>