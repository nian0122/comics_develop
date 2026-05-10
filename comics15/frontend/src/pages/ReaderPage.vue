<template>
  <section id="readerView">
    <ReaderShell
      :can-prev="canPrev"
      :can-next="canNext"
      :progress-text="progressText"
      :menu-visible="menuVisible"
      :actions-visible="actionsVisible"
      @prev="openPrevChapter"
      @next="openNextChapter"
      @back="backToDirectory"
      @jump="showJumpModal"
      @toggle-menu="toggleMenu"
    />
    <div id="reader" @scroll="handleScroll">
      <ReaderMediaItem
        v-for="(file, index) in files"
        :key="file.name"
        :ref="(el) => setMediaItemRef(el, index)"
        :file="file"
        :series-name="seriesName"
        :index="index"
        :scale="scale"
        @loaded="handleMediaLoaded"
        @failed="handleMediaFailed"
      />
    </div>
    <JumpPageModal
      :visible="jumpModalVisible"
      :total-pages="totalPages"
      @confirm="jumpToPage"
      @cancel="hideJumpModal"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChapterStore } from '../stores/chapter-store.js';
import { useReaderStore } from '../stores/reader-store.js';
import { useProgressStore } from '../stores/progress-store.js';
import { useSeriesStore } from '../stores/series-store.js';
import { persistence } from '../services/persistence.js';
import { toReaderUrl } from '../router/index.js';
import { LAZY_LOAD_CONFIG } from '../config/constants.js';
import ReaderShell from '../components/ReaderShell.vue';
import ReaderMediaItem from '../components/ReaderMediaItem.vue';
import JumpPageModal from '../components/JumpPageModal.vue';

const route = useRoute();
const router = useRouter();
const chapterStore = useChapterStore();
const readerStore = useReaderStore();
const progressStore = useProgressStore();
const seriesStore = useSeriesStore();

const seriesName = computed(() => route.params.series);
const chapterPath = computed(() => route.params.path);

const files = computed(() => readerStore.files);
const loading = ref(false);
const error = ref(null);
const scale = computed(() => readerStore.scale || 100);

const menuVisible = ref(false);
const actionsVisible = ref(false);
const jumpModalVisible = ref(false);

const lazyObserver = ref(null);

const canPrev = computed(() => chapterStore.currentIndex > 0);
const canNext = computed(() => chapterStore.currentIndex < chapterStore.flatList.length - 1);

const totalPages = computed(() => progressStore.totalPages);
const currentPage = computed(() => progressStore.currentPage);
const progressText = computed(() => `${currentPage.value} / ${totalPages.value}`);

const mediaItemRefs = ref([]);
let returnPath = '';

function setMediaItemRef(el, index) {
    if (el) {
        mediaItemRefs.value[index] = el;
    }
}

function clearMediaItemRefs() {
    mediaItemRefs.value = [];
}

async function loadData() {
    loading.value = true;
    error.value = null;
    clearMediaItemRefs();

    try {
        if (!seriesStore.current || seriesStore.current !== seriesName.value) {
            seriesStore.setCurrentSeries(seriesName.value);
        }

        if (chapterStore.flatList.length === 0 || seriesStore.current !== seriesName.value) {
            await chapterStore.loadChapters(seriesName.value);
        }

        chapterStore.setCurrentChapterByPathId(chapterPath.value);
        const currentIndex = chapterStore.currentIndex;

        if (currentIndex < 0) {
            error.value = '未找到章节';
            return;
        }

        const chapter = chapterStore.getCurrentChapter();
        if (!chapter) {
            error.value = '章节数据无效';
            return;
        }

        returnPath = chapter.path_id;

        const loadedFiles = await readerStore.loadFiles(seriesName.value, chapterPath.value);

        // init 已经包含了 restoreFromStorage 逻辑，不需要重复调用
        progressStore.init(loadedFiles.length, seriesName.value, currentIndex);

        persistence.saveCurrentPosition(seriesName.value, returnPath);

        await nextTick();
        setupLazyObserver();
    } catch (e) {
        error.value = e.message || '加载失败';
        console.error('ReaderPage load error:', e);
    } finally {
        loading.value = false;
    }
}

function setupLazyObserver() {
    if (!globalThis.IntersectionObserver) {
        return;
    }

    if (lazyObserver.value) {
        lazyObserver.value.disconnect();
    }

    lazyObserver.value = new globalThis.IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const container = entry.target;
                const indexAttr = container.dataset.index;
                if (indexAttr !== undefined) {
                    const index = parseInt(indexAttr, 10);
                    const mediaItem = mediaItemRefs.value[index];
                    if (mediaItem && mediaItem.loadMedia) {
                        mediaItem.loadMedia();
                    }
                }
                lazyObserver.value.unobserve(container);
            }
        }
    }, {
        rootMargin: LAZY_LOAD_CONFIG.ROOT_MARGIN,
        threshold: 0
    });

    nextTick(() => {
        const containers = document.querySelectorAll('.lazy-image-container');
        containers.forEach((container) => {
            lazyObserver.value.observe(container);
        });
    });
}

function handleScroll() {
    const readerEl = document.getElementById('reader');
    if (!readerEl) return;

    const scrollable = readerEl.scrollHeight - readerEl.clientHeight;
    if (scrollable <= 0) return;

    const percent = (readerEl.scrollTop / scrollable) * 100;
    progressStore.updateScrollPercent(percent);

    updateCurrentPageOnScroll(readerEl);
}

function updateCurrentPageOnScroll(readerEl) {
    const containers = readerEl.querySelectorAll('.lazy-image-container');
    if (containers.length === 0) return;

    const viewportTop = readerEl.scrollTop;
    const viewportHeight = readerEl.clientHeight;
    const viewportMiddle = viewportTop + viewportHeight / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    containers.forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        const containerTop = rect.top + viewportTop;
        const containerMiddle = containerTop + rect.height / 2;
        const distance = Math.abs(containerMiddle - viewportMiddle);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index + 1;
        }
    });

    progressStore.setCurrentPage(closestIndex);
    progressStore.saveToStorage(seriesName.value, chapterStore.currentIndex);
}

// ReaderMediaItem emit payload 形状: { index, filename }
function handleMediaLoaded(payload) {
    readerStore.setLoadedCount(payload.index + 1);
}

function handleMediaFailed(payload) {
    console.error(`Media item ${payload.index} (${payload.filename}) 加载失败`);
}

function openPrevChapter() {
    if (!canPrev.value) return;

    const prevIndex = chapterStore.currentIndex - 1;
    const prevChapter = chapterStore.getChapterAtIndex(prevIndex);
    if (!prevChapter) return;

    const url = toReaderUrl(seriesName.value, prevChapter.path_id);
    router.push(url);
}

function openNextChapter() {
    if (!canNext.value) return;

    const nextIndex = chapterStore.currentIndex + 1;
    const nextChapter = chapterStore.getChapterAtIndex(nextIndex);
    if (!nextChapter) return;

    const url = toReaderUrl(seriesName.value, nextChapter.path_id);
    router.push(url);
}

function backToDirectory() {
    // 使用 back() 返回上一页，保持浏览器历史自然
    router.back();
}

function showJumpModal() {
    jumpModalVisible.value = true;
}

function hideJumpModal() {
    jumpModalVisible.value = false;
}

function jumpToPage(pageNum) {
    jumpModalVisible.value = false;

    const page = parseInt(pageNum, 10);
    if (page < 1 || page > totalPages.value) return;

    progressStore.setCurrentPage(page);

    const containers = document.querySelectorAll('.lazy-image-container');
    const targetContainer = containers[page - 1];
    if (!targetContainer) return;

    const readerEl = document.getElementById('reader');
    if (!readerEl) return;

    const containerTop = targetContainer.offsetTop;
    readerEl.scrollTo({
        top: containerTop,
        behavior: 'smooth'
    });

    const index = page - 1;
    const mediaItem = mediaItemRefs.value[index];
    if (mediaItem && mediaItem.loadMedia) {
        mediaItem.loadMedia();
    }
}

function toggleMenu() {
    menuVisible.value = !menuVisible.value;
    actionsVisible.value = menuVisible.value;
}

function cleanupObserver() {
    if (lazyObserver.value) {
        lazyObserver.value.disconnect();
        lazyObserver.value = null;
    }
}

onMounted(() => {
    loadData();
});

onUnmounted(() => {
    cleanupObserver();
    clearMediaItemRefs();
});

watch(() => route.params.path, (newPath, oldPath) => {
    if (newPath !== oldPath) {
        cleanupObserver();
        loadData();
    }
});

defineExpose({
    mediaItemRefs,
    setMediaItemRef,
    clearMediaItemRefs,
    jumpModalVisible
});
</script>
