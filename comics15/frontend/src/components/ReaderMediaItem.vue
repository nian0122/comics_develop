<template>
  <div
    class="lazy-image-container"
    :class="{ loaded: isLoaded, failed: isFailed }"
    :data-index="index"
    :data-filename="file?.name"
    :data-path-id="file?.path_id"
    :data-series-name="seriesName"
    :data-cover-source="file?.preferredSource || file?.cover_source || undefined"
    :data-loaded="isLoaded ? 'true' : 'false'"
  >
    <div class="skeleton-wrapper">
      <div class="skeleton-image skeleton"></div>
    </div>
    <img
      v-if="mediaType === 'image' && shouldRender"
      class="reader-img"
      :src="currentUrl"
      :alt="file?.name"
      loading="lazy"
      decoding="async"
      :style="{ width: `${scale}%` }"
      @load="handleLoad"
      @error="handleError"
      @click="handleClick"
    />
    <img
      v-if="mediaType === 'gif' && shouldRender"
      class="reader-img"
      :src="currentUrl"
      :alt="file?.name"
      loading="lazy"
      decoding="async"
      :style="{ width: `${scale}%` }"
      @load="handleLoad"
      @error="handleError"
      @click="handleClick"
    />
    <video
      v-if="mediaType === 'video' && shouldRender"
      class="reader-img"
      :src="currentUrl"
      controls
      :autoplay="false"
      :loop="false"
      preload="metadata"
      :style="{ maxHeight: '80vh', width: `${scale}%` }"
      @loadeddata="handleLoad"
      @error="handleVideoError"
    />
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { getFileType } from '../utils/file-type.js';
import { IMAGE_RETRY_CONFIG, DOUBLE_CLICK_THRESHOLD } from '../config/constants.js';

const props = defineProps({
    file: {
        type: Object,
        required: true
    },
    index: {
        type: Number,
        required: true
    },
    seriesName: {
        type: String,
        required: true
    },
    scale: {
        type: Number,
        default: 100
    }
});

const emit = defineEmits(['loaded', 'failed']);

const isLoaded = ref(false);
const isFailed = ref(false);
const currentUrl = ref('');
const useHQ = ref(false);
const retryCount = ref(0);
const loadStatus = ref('idle');
const timeoutId = ref(null);
const lastClickTime = ref(0);

const mediaType = computed(() => {
    return props.file?.mediaType || getFileType(props.file?.name);
});

const shouldRender = computed(() => {
    return currentUrl.value && loadStatus.value !== 'idle';
});

function clearPendingTimeout() {
    if (timeoutId.value) {
        globalThis.clearTimeout(timeoutId.value);
        timeoutId.value = null;
    }
}

function clearMediaElement() {
    currentUrl.value = '';
}

async function loadMedia(forceHQ = false) {
    if (loadStatus.value === 'success') {
        return;
    }

    if (retryCount.value >= IMAGE_RETRY_CONFIG.MAX_RETRIES && loadStatus.value === 'failed') {
        return;
    }

    const type = mediaType.value;
    if (!type) {
        return;
    }

    clearPendingTimeout();
    loadStatus.value = 'loading';

    let url;
    let shouldUseHQ = forceHQ;

    if (type === 'video' || type === 'gif') {
        // 使用后端返回的 videoUrl
        url = props.file?.videoUrl;
    } else {
        // 图片类型
        const preferredSource = props.file?.preferredSource;
        
        if (forceHQ) {
            shouldUseHQ = true;
            url = props.file?.hq?.url;
        } else if (preferredSource === 'hq') {
            shouldUseHQ = true;
            url = props.file?.hq?.url;
        } else {
            // 默认使用 LQ，如果不存在则回退到 HQ
            url = props.file?.lq?.url || props.file?.hq?.url;
        }
    }

    if (!url) {
        loadStatus.value = 'failed';
        isFailed.value = true;
        emit('failed', { index: props.index, filename: props.file?.name });
        return;
    }

    useHQ.value = shouldUseHQ;
    currentUrl.value = url;

    timeoutId.value = setTimeout(() => {
        if (loadStatus.value === 'loading') {
            handleTimeout();
        }
    }, 10000);
}

function handleLoad() {
    clearPendingTimeout();
    loadStatus.value = 'success';
    retryCount.value = 0;
    isLoaded.value = true;
    isFailed.value = false;

    emit('loaded', { index: props.index, filename: props.file?.name });
}

function handleError() {
    if (!useHQ.value && props.file?.hq?.url) {
        loadStatus.value = 'loading';
        useHQ.value = true;
        currentUrl.value = props.file.hq.url;
        return;
    }
    handleFinalError();
}

function handleVideoError() {
    handleFinalError();
}

function handleTimeout() {
    if (mediaType.value === 'video') {
        handleFinalError();
    } else {
        handleError();
    }
}

function handleFinalError() {
    retryCount.value++;

    if (retryCount.value >= IMAGE_RETRY_CONFIG.MAX_RETRIES) {
        clearPendingTimeout();
        loadStatus.value = 'failed';
        isFailed.value = true;
        emit('failed', { index: props.index, filename: props.file?.name });
    } else {
        loadStatus.value = 'retrying';
        const delay = Math.min(
            IMAGE_RETRY_CONFIG.INITIAL_DELAY * Math.pow(IMAGE_RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount.value),
            IMAGE_RETRY_CONFIG.MAX_DELAY
        );

        timeoutId.value = setTimeout(() => {
            loadStatus.value = 'loading';
            loadMedia(false);
        }, delay);
    }
}

async function handleClick(event) {
    const currentTime = Date.now();

    if (currentTime - lastClickTime.value < DOUBLE_CLICK_THRESHOLD) {
        if (useHQ.value || !props.file?.hq?.url) {
            lastClickTime.value = 0;
            return;
        }

        event.preventDefault();
        
        // 切换到 HQ 版本
        useHQ.value = true;
        currentUrl.value = props.file.hq.url;

        lastClickTime.value = 0;
    } else {
        lastClickTime.value = currentTime;
    }
}

onBeforeUnmount(() => {
    clearPendingTimeout();
    clearMediaElement();
});

defineExpose({
    loadMedia
});
</script>
