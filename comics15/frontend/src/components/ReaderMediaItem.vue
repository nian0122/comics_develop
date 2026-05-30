<script setup lang="ts">
import ReaderImageItem from './ReaderImageItem.vue'
import ReaderVideoItem from './ReaderVideoItem.vue'

defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()
</script>

<template>
  <ReaderImageItem
    v-if="kind === 'image'"
    :url="url"
    :fallback-url="fallbackUrl"
    :alt="alt"
  />
  <ReaderVideoItem
    v-else
    :url="url"
    :alt="alt"
  />
</template>
