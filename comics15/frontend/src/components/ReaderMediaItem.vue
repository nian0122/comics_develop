<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

const currentSrc = ref(props.url)

function onError() {
  if (props.fallbackUrl && currentSrc.value !== props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
  }
}

function onDblClick() {
  if (props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
  }
}
</script>

<template>
  <img
    v-if="kind === 'image'"
    :src="currentSrc"
    :alt="alt"
    loading="lazy"
    class="w-full select-none block"
    @error="onError"
    @dblclick="onDblClick"
  />
  <video
    v-else
    :src="currentSrc"
    class="w-full"
    controls
    playsinline
  />
</template>
