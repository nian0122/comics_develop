<template>
  <div
    class="lazy-image-container"
    :class="{ loaded: isLoaded, failed: isFailed }"
    :data-index="index"
    :data-filename="filename"
    :data-path-id="pathId"
    :data-series-name="seriesName"
    :data-cover-source="coverSource || undefined"
    :data-loaded="isLoaded ? 'true' : 'false'"
  >
    <div class="skeleton-wrapper">
      <div class="skeleton-image skeleton"></div>
    </div>
    <img
      v-if="mediaType === 'image' && shouldRender"
      class="reader-img"
      :src="currentUrl"
      :alt="filename"
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
      :alt="filename"
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
import { api } from '../services/api.js';
import { getFileType, useVideoPath } from '../utils/file-type.js';
import { IMAGE_RETRY_CONFIG, DOUBLE_CLICK_THRESHOLD } from '../config/constants.js';

const props = defineProps({
    filename: {
        type: String,
        required: true
    },
    pathId: {
        type: String,
        required: true
    },
    seriesName: {
        type: String,
        required: true
    },
    index: {
        type: Number,
        required: true
    },
    coverSource: {
        type: String,
        default: ''
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
    const type = getFileType(props.filename);
    return type;
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

    const type = getFileType(props.filename);
    if (!type) {
        return;
    }

    clearPendingTimeout();
    loadStatus.value = 'loading';

    const isVideoPath = useVideoPath(props.filename);
    let url;
    let shouldUseHQ = forceHQ;

    if (isVideoPath) {
        url = api.buildVideoUrl(props.seriesName, props.filename, props.pathId);
    } else {
        if (forceHQ || props.coverSource === 'hq') {
            shouldUseHQ = true;
            url = api.buildHQImageUrl(props.seriesName, props.filename, props.pathId);
        } else if (props.coverSource === 'lq') {
            url = api.buildLQImageUrl(props.seriesName, props.filename, props.pathId);
        } else {
            const imageSource = await api.resolveImageUrl(props.seriesName, props.filename, props.pathId);
            shouldUseHQ = imageSource.source === 'hq';
            url = imageSource.url;
        }
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

    emit('loaded', { index: props.index, filename: props.filename });
}

function handleError() {
    if (!useHQ.value) {
        loadStatus.value = 'loading';
        useHQ.value = true;
        currentUrl.value = api.buildHQImageUrl(props.seriesName, props.filename, props.pathId);
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
        emit('failed', { index: props.index, filename: props.filename });
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
        if (!currentUrl.value.includes('/lq_image/')) {
            lastClickTime.value = 0;
            return;
        }

        event.preventDefault();
        const hqUrl = api.buildHQImageUrl(props.seriesName, props.filename, props.pathId);

        try {
            const isUsable = await api.checkHQImageUsable(hqUrl);
            if (isUsable) {
                useHQ.value = true;
                currentUrl.value = hqUrl;
            }
        } catch {
            // HQ 可用性检查失败时保持当前 LQ 图片，无需用户感知的错误提示
        }

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