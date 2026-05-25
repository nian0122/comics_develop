<script setup lang="ts">
import ReaderProgressBadge from './ReaderProgressBadge.vue'
import ReaderQuickActions from './ReaderQuickActions.vue'

defineProps<{
  currentPage: number
  totalPages: number
  previousDisabled?: boolean
  nextDisabled?: boolean
}>()

const emit = defineEmits<{
  jump: [page: number]
  previous: []
  next: []
  back: []
}>()
</script>

<template>
  <ReaderProgressBadge
    :current-page="currentPage"
    :total-pages="totalPages"
    @jump="emit('jump', $event)"
  />

  <ReaderQuickActions
    :previous-disabled="previousDisabled"
    :next-disabled="nextDisabled"
    @previous="emit('previous')"
    @next="emit('next')"
    @back="emit('back')"
  />
</template>
