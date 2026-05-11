<script setup>
import ReaderProgressBadge from './ReaderProgressBadge.vue'
import ReaderQuickActions from './ReaderQuickActions.vue'

defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  previousDisabled: {
    type: Boolean,
    default: false
  },
  nextDisabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['jump', 'previous', 'next', 'back'])
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
