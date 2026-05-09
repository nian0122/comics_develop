<template>
  <button
    class="chapter-card-v2"
    :data-path-id="chapter.path_id"
    @click="$emit('open', chapter.path_id)"
  >
    <span class="chapter-cover skeleton" :data-cover-path="chapter.path_id"></span>
    <span class="chapter-card-body">
      <strong>{{ displayName }}</strong>
      <span :data-progress-path="chapter.path_id">{{ progressText }}</span>
      <small>{{ pathLabel }}</small>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import {
    getChapterDisplayName,
    getParentPath,
    formatChapterProgress
} from '../../js/utils/chapter-tree.js';

const props = defineProps({
    chapter: {
        type: Object,
        required: true
    },
    progress: {
        type: Object,
        default: null
    },
    seriesName: {
        type: String,
        required: true
    }
});

defineEmits(['open']);

const displayName = computed(() => getChapterDisplayName(props.chapter));
const pathLabel = computed(() => getParentPath(props.chapter.path_id) || props.seriesName);
const progressText = computed(() =>
    formatChapterProgress(props.progress, props.chapter.total_files || 0)
);
</script>