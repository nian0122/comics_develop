<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getMediaSource } from '../services/media-url.js'
import { observeLazyImage } from '../utils/lazy-image.js'

const props = defineProps({
  media: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
})

const visible = ref(false)
const useFallback = ref(false)
const mediaRef = ref(null)
const activeMediaRef = ref(null)
const source = computed(() => getMediaSource(props.media))
const activeUrl = computed(() => {
  if (useFallback.value && source.value.fallbackUrl) {
    return source.value.fallbackUrl
  }

  return source.value.url
})
const safeUrl = computed(() => (props.active ? activeUrl.value : ''))

function markVisible() {
  visible.value = true
}

function useHighQuality() {
  if (source.value.fallbackUrl) {
    useFallback.value = true
  }
}

function stopMediaRequest() {
  const element = activeMediaRef.value

  if (!element) {
    return
  }

  element.removeAttribute('src')
  element.src = ''

  if (typeof element.load === 'function') {
    element.load()
  }
}

let cleanupObserver = () => {}

onMounted(() => {
  if (mediaRef.value) {
    cleanupObserver = observeLazyImage(mediaRef.value, () => {
      markVisible()
    })
  } else {
    visible.value = true
  }
})

watch(() => props.active, (active) => {
  if (!active) {
    stopMediaRequest()
  }
})

onBeforeUnmount(() => {
  cleanupObserver()
  stopMediaRequest()
})

defineExpose({ markVisible })
</script>

<template>
  <figure ref="mediaRef" class="w-full overflow-hidden bg-black">
    <div v-if="!visible" class="flex min-h-80 items-center justify-center text-sm text-slate-400">
      第 {{ index + 1 }} 页
    </div>

    <video
      v-else-if="source.kind === 'video'"
      ref="activeMediaRef"
      class="w-full"
      :src="safeUrl"
      controls
      playsinline
    />

    <img
      v-else
      ref="activeMediaRef"
      class="w-full select-none block"
      :src="safeUrl"
      :alt="`第 ${index + 1} 页`"
      loading="lazy"
      @error="useHighQuality"
      @dblclick="useHighQuality"
    />
  </figure>
</template>
