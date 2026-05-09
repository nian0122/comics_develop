<template>
  <section class="mobile-view">
    <!-- 加载状态 -->
    <template v-if="seriesStore.loading">
      <div class="mobile-page-header">
        <p class="mobile-kicker">Library</p>
        <h1>漫画阅读器</h1>
      </div>
      <div class="mobile-state-card">正在加载系列...</div>
    </template>

    <!-- 错误状态 -->
    <template v-else-if="seriesStore.error">
      <div class="mobile-page-header">
        <p class="mobile-kicker">Library</p>
        <h1>漫画阅读器</h1>
      </div>
      <div class="mobile-state-card error-state">
        <strong>加载失败</strong>
        <span>无法连接到后端或加载系列列表。</span>
        <button id="retrySeriesBtn" class="primary-btn" @click="handleRetry">重试</button>
      </div>
    </template>

    <!-- 系列列表 -->
    <template v-else>
      <div class="mobile-page-header">
        <p class="mobile-kicker">Library</p>
        <h1>漫画阅读器</h1>
        <p>选择系列，继续进入逐级目录。</p>
      </div>
      <label class="mobile-search-label" for="seriesSearch">搜索系列</label>
      <input
        id="seriesSearch"
        class="glass-input mobile-search"
        placeholder="搜索系列"
        autocomplete="off"
        v-model="searchQuery"
      >
      <div id="seriesList" class="series-list">
        <template v-if="seriesStore.list.length > 0">
          <button
            v-for="name in seriesStore.list"
            :key="name"
            class="series-row"
            :data-series="name"
            :hidden="!matchesSearch(name)"
            @click="handleSeriesClick(name)"
          >
            <span class="series-name">{{ name }}</span>
            <span v-if="getReadingHint(name)" class="series-reading-hint">
              {{ getReadingHint(name) }}
            </span>
            <span class="row-chevron">›</span>
          </button>
        </template>
        <div v-else class="mobile-state-card">暂无系列</div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSeriesStore } from '../stores/series-store.js';
import { storage } from '../../js/services/storage.js';
import { toSeriesUrl } from '../router/index.js';

const router = useRouter();
const seriesStore = useSeriesStore();

const searchQuery = ref('');

function matchesSearch(name) {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return name.toLowerCase().includes(query);
}

function getReadingHint(name) {
  const lastReading = storage.getSeriesLastReading(name);
  if (lastReading && lastReading.page > 0) {
    return `读到第 ${lastReading.page}/${lastReading.totalPages} 页`;
  }
  return null;
}

function handleSeriesClick(name) {
  seriesStore.setCurrentSeries(name);
  router.push(toSeriesUrl(name));
}

function handleRetry() {
  seriesStore.loadSeries();
}

onMounted(() => {
  seriesStore.loadSeries();
});
</script>