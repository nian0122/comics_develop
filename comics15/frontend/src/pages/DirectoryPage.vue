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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChapterStore } from '../stores/chapter-store.js';
import { storage } from '../../js/services/storage.js';
import { toDirectoryUrl, toReaderUrl, toSeriesListUrl } from '../router/index.js';
import { splitChapterPath, getParentPath } from '../../js/utils/chapter-tree.js';
import ChapterCard from '../components/ChapterCard.vue';

const route = useRoute();
const router = useRouter();
const chapterStore = useChapterStore();

const seriesName = computed(() => route.params.series || '');
const currentPath = computed(() => route.params.path || '');
const levelNodes = ref([]);
const progressData = ref({});

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
</script>