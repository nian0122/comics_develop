<template>
  <div class="reader-video-wrapper">
    <video
      ref="videoRef"
      :src="src"
      class="reader-video"
      :style="{ width: `${scale}%` }"
      controls
      preload="metadata"
      @loadeddata="handleLoad"
      @error="handleError"
    >
      <p>您的浏览器不支持视频播放。文件: {{ filename }}</p>
    </video>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  src: string;
  filename: string;
  scale: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  load: [];
  error: [];
}>();

// 是否已加载
const loaded = ref(false);

// 处理加载完成
function handleLoad(): void {
  loaded.value = true;
  emit('load');
}

// 处理加载错误
function handleError(): void {
  console.error(`[ReaderVideo] Failed to load video: ${props.src}`);
  emit('error');
}

// 监听 src 变化，重置加载状态
watch(() => props.src, () => {
  loaded.value = false;
});
</script>

<style scoped>
.reader-video-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  padding: 10px 0;
}

.reader-video {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  box-shadow: none;
  border-radius: 0;
  background-color: #27272a;
  transition: width 0.2s ease;
}
</style>