<!--
  对应原 HTML 逻辑块: appendNextImages() 中的图片渲染部分 + handleImageClick()
  - 图片懒加载
  - 双击切换 HQ 图片
  - 加载错误处理
  - 缩放样式应用
-->

<template>
  <div class="reader-image-wrapper">
    <img
      ref="imgRef"
      :src="src"
      :alt="`图片: ${filename}`"
      class="reader-img"
      :style="{ width: `${scale}%` }"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="handleError"
      @dblclick="handleDoubleClick"
    />
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
  dblclick: [imgElement: HTMLImageElement];
}>();

// DOM 引用
const imgRef = ref<HTMLImageElement | null>(null);

// 是否已加载
const loaded = ref(false);

// 处理加载完成
function handleLoad(): void {
  loaded.value = true;
  emit('load');
}

// 处理加载错误
function handleError(): void {
  console.error(`[ReaderImage] Failed to load image: ${props.src}`);

  // 设置错误占位样式
  if (imgRef.value) {
    imgRef.value.style.backgroundColor = '#444';
  }

  emit('error');
}

// 处理双击
function handleDoubleClick(): void {
  if (imgRef.value) {
    emit('dblclick', imgRef.value);
  }
}

// 监听 src 变化，重置加载状态
watch(() => props.src, () => {
  loaded.value = false;
});
</script>

<style scoped>
.reader-image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

.reader-img {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
  margin-bottom: 0;
  box-shadow: none;
  border-radius: 0;
  background-color: #27272a;
  transition: width 0.2s ease;
}
</style>
