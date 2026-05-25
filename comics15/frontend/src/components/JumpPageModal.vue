<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  confirm: [page: number]
  close: []
}>()

const pageInput = ref(String(props.currentPage))

function clampPage(value: string): number {
  const page = Number.parseInt(value, 10)

  if (Number.isNaN(page)) {
    return props.currentPage
  }

  return Math.min(Math.max(page, 1), props.totalPages)
}

function submit() {
  emit('confirm', clampPage(pageInput.value))
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
    <form class="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl" @submit.prevent="submit">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">跳转页码</h2>
        <button type="button" data-close="true" class="text-slate-400" @click="emit('close')">关闭</button>
      </div>

      <p class="mb-3 text-sm text-slate-400">当前 {{ currentPage }} / {{ totalPages }}</p>
      <input
        v-model="pageInput"
        class="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
        type="number"
        min="1"
        :max="totalPages"
      />

      <button type="submit" class="w-full rounded-xl bg-sky-500 px-4 py-3 font-medium text-white">
        确认跳转
      </button>
    </form>
  </div>
</template>
