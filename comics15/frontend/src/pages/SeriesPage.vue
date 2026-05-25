<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/series-store'
import { createSeriesRootRoute } from '@/router'

const seriesStore = useSeriesStore()
const router = useRouter()

onMounted(() => {
  if (seriesStore.series.length === 0 && !seriesStore.loading) {
    seriesStore.loadSeries()
  }
})

function openSeries(seriesName: string) {
  router.push(createSeriesRootRoute(seriesName))
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <section class="mx-auto flex max-w-5xl flex-col gap-6">
      <header class="space-y-2">
        <p class="text-xs uppercase tracking-[0.4em] text-sky-400">Comic Reader</p>
        <h1 class="text-2xl font-semibold text-white sm:text-3xl">漫画系列</h1>
        <p class="text-sm text-slate-400">选择一个系列继续浏览章节。</p>
      </header>

      <div v-if="seriesStore.loading" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-inner">
        加载中…
      </div>

      <div v-else-if="seriesStore.error" class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-200 shadow-inner">
        <p class="mb-4">{{ seriesStore.error }}</p>
        <button class="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white" @click="seriesStore.loadSeries()">
          重试
        </button>
      </div>

      <div v-else-if="seriesStore.series.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-inner">
        暂无系列
      </div>

      <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="series in seriesStore.series" :key="series">
          <button
            class="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-left transition hover:border-sky-500 hover:bg-slate-900"
            :data-series="series"
            @click="openSeries(series)"
          >
            <span class="font-medium text-white">{{ series }}</span>
            <span class="text-sky-400">›</span>
          </button>
        </li>
      </ul>
    </section>
  </main>
</template>
