<template>
  <main id="app" class="mobile-shell">
    <RouterView />
  </main>
</template>

<script setup>
import { onMounted } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useSeriesStore } from './stores/series-store.js';
import { persistence } from './services/persistence.js';
import { toReaderUrl, toSeriesUrl } from './router/index.js';

const router = useRouter();
const route = useRoute();
const seriesStore = useSeriesStore();

onMounted(async () => {
    // 只有在根路径才尝试从历史记录恢复到最后阅读位置
    if (route.path !== '/') {
        return;
    }

    try {
        await seriesStore.loadSeries();

        const savedSeries = persistence.getCurrentSeries();
        const savedChapterPath = persistence.getCurrentChapterPath();

        if (!savedSeries) {
            return;
        }

        const seriesExists = seriesStore.list.includes(savedSeries);
        if (!seriesExists) {
            return;
        }

        const hasValidChapter = savedChapterPath && savedChapterPath.trim() !== '';

        if (hasValidChapter) {
            router.replace(toReaderUrl(savedSeries, savedChapterPath));
        } else {
            router.replace(toSeriesUrl(savedSeries));
        }
    } catch (e) {
        console.warn('根路径恢复加载系列失败:', e.message || e);
    }
});
</script>