<template>
  <section class="mobile-view">
    <template v-if="chapterStore.loading">
      <div class="mobile-topbar">
        <button class="text-back-btn" @click="handleBack">{{ backText }}</button>
      </div>
      <div class="mobile-page-header compact">
        <p class="mobile-kicker">{{ seriesName }}</p>
        <h1>{{ pageTitle }}</h1>
        <p>正在加载...</p>
      </div>
    </template>

    <template v-else-if="chapterStore.error">
      <div class="mobile-topbar">
        <button class="text-back-btn" @click="handleBack">{{ backText }}</button>
      </div>
      <div class="mobile-page-header compact">
        <p class="mobile-kicker">{{ seriesName }}</p>
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="mobile-state-card error-state">
        <strong>加载失败</strong>
        <span>无法加载目录内容。</span>
        <button id="retryDirectoryBtn" class="primary-btn" @click="handleRetry">重试</button>
      </div>
    </template>

    <template v-else>
      <div class="mobile-topbar">
        <button class="text-back-btn" @click="handleBack">{{ backText }}</button>
      </div>
      <div class="mobile-page-header compact">
        <p class="mobile-kicker">{{ seriesName }}</p>
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="directory-list">
        <template v-if="levelNodes.length > 0">
          <template v-for="node in levelNodes" :key="node.path || node.path_id">
            <button
              v-if="node.type === 'directory'"
              class="directory-row"
              :data-path="node.path"
              @click="handleNodeClick(node)"
            >
              <span class="folder-mark">⌁</span>
              <span>{{ node.name }}</span>
              <span class="row-chevron">›</span>
            </button>
            <ChapterCard
              v-else
              :chapter="node"
              :progress="progressData[node.path_id]"
              :seriesName="seriesName"
              :cover="coverData[node.path_id]"
              @open="handleChapterOpen"
            />
          </template>
        </template>
        <div v-else class="mobile-state-card">当前目录为空</div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChapterStore } from '../stores/chapter-store.js';
import { storage } from '../services/storage.js';
import { toDirectoryUrl, toReaderUrl, toSeriesListUrl } from '../router/index.js';
import { splitChapterPath, getParentPath } from '../utils/chapter-tree.js';
import { ChapterMetaCache } from '../services/chapter-meta-cache.js';
import { RequestQueue } from '../utils/request-queue.js';
import { LAZY_LOAD_CONFIG } from '../config/constants.js';
import ChapterCard from '../components/ChapterCard.vue';

const route = useRoute();
const router = useRouter();
const chapterStore = useChapterStore();

const seriesName = computed(() => route.params.series || '');
const currentPath = computed(() => route.params.path || '');
const levelNodes = ref([]);
const progressData = ref({});
const coverData = ref({});

const coverObserver = ref(null);
const coverLoadQueue = ref(null);
const coverLoadToken = ref(0);
const chapterMetaCache = ref(null);

const pageTitle = computed(() => {
  if (!currentPath.value) return seriesName.value;
  const parts = splitChapterPath(currentPath.value);
  return parts.at(-1) || seriesName.value;
});

const backText = computed(() => {
  if (!currentPath.value) return '‹ 系列';
  const parent = getParentPath(currentPath.value);
  return parent ? `‹ ${parent}` : `‹ ${seriesName.value}`;
});

async function loadData() {
  progressData.value = storage.getSeriesProgress(seriesName.value);
  await chapterStore.loadChapters(seriesName.value);
  const nodes = await chapterStore.loadLevelNodes(seriesName.value, currentPath.value);
  levelNodes.value = nodes || [];

  coverData.value = {};
  coverLoadToken.value += 1;
  const currentToken = coverLoadToken.value;

  await nextTick();
  setupCoverObserver(currentToken);
}

function setupCoverObserver(currentToken) {
  if (!globalThis.IntersectionObserver) return;

  if (coverObserver.value) {
    coverObserver.value.disconnect();
  }

  if (!coverLoadQueue.value) {
    coverLoadQueue.value = new RequestQueue(LAZY_LOAD_CONFIG.COVER_MAX_CONCURRENT);
  }

  if (!chapterMetaCache.value) {
    chapterMetaCache.value = new ChapterMetaCache();
  }

  coverObserver.value = new globalThis.IntersectionObserver(async (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const coverEl = entry.target;
        const pathId = coverEl.dataset.coverPath;
        if (!pathId) continue;

        await coverLoadQueue.value.add(async () => {
          if (currentToken !== coverLoadToken.value) return;

          try {
            const meta = await chapterMetaCache.value.getOrFetchByPathId(pathId);
            if (currentToken === coverLoadToken.value && meta.coverUrl) {
              coverData.value[pathId] = meta.coverUrl;
            }
          } catch (err) {
            console.error(`封面加载失败: ${pathId}`, err);
          }
        });
      }
    }
  }, { rootMargin: LAZY_LOAD_CONFIG.COVER_ROOT_MARGIN });

  const coverEls = document.querySelectorAll('.chapter-cover[data-cover-path]');
  coverEls.forEach(el => coverObserver.value.observe(el));
}

function handleBack() {
  if (!currentPath.value) {
    router.push(toSeriesListUrl());
    return;
  }
  const parent = getParentPath(currentPath.value);
  router.push(toDirectoryUrl(seriesName.value, parent));
}

function handleNodeClick(node) {
  router.push(toDirectoryUrl(seriesName.value, node.path));
}

function handleChapterOpen(pathId) {
  chapterStore.setCurrentChapterByPathId(pathId);
  router.push(toReaderUrl(seriesName.value, pathId));
}

function handleRetry() {
  loadData();
}

onMounted(() => {
  loadData();
});

watch([seriesName, currentPath], () => {
  loadData();
});

onBeforeUnmount(() => {
  if (coverObserver.value) {
    coverObserver.value.disconnect();
    coverObserver.value = null;
  }
  if (coverLoadQueue.value) {
    coverLoadQueue.value.clear();
    coverLoadQueue.value = null;
  }
});
</script>