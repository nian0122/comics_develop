<!--
  对应原 HTML 逻辑块: #reader 容器
  - 空状态显示
  - 图片/视频混合渲染
  - 无限滚动加载
  - 加载指示器
  - 双击 HQ 切换事件转发
-->

<template>
  <div
    id="reader"
    ref="readerEl"
    class="reader flex-grow overflow-y-auto outline-none"
    tabindex="0"
    @scroll="handleScroll"
  >
    <!-- 空状态 -->
    <div
      v-if="!hasChapter"
      class="flex flex-col items-center justify-center h-full text-center text-gray-500 p-10"
    >
      <svg
        class="w-16 h-16 mb-4 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253"
        />
      </svg>
      <div class="text-xl font-medium mb-2">请先选择漫画系列和章节</div>
      <div class="text-sm">侧边栏包含您所有的本地漫画系列和章节。</div>
    </div>

    <!-- 文件列表 -->
    <template v-else>
      <div
        v-for="(file, index) in visibleFiles"
        :key="`${file.filename}-${index}`"
        class="reader-item"
      >
        <ReaderImage
          v-if="file.type === 'image'"
          :src="file.url"
          :filename="file.filename"
          :scale="scale"
          @dblclick="handleImageDoubleClick"
        />
        <ReaderVideo
          v-else-if="file.type === 'video'"
          :src="file.url"
          :filename="file.filename"
          :scale="scale"
        />
      </div>

      <!-- 加载指示器 -->
      <LoadingIndicator v-if="showLoadingIndicator" />

      <!-- 已加载完成提示 -->
      <div
        v-if="loadedCount >= files.length && files.length > 0"
        class="text-center py-6 text-gray-500"
      >
        已加载全部 {{ files.length }} 个文件
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ReaderImage from './ReaderImage.vue';
import ReaderVideo from './ReaderVideo.vue';
import LoadingIndicator from './LoadingIndicator.vue';
import { getFileType, buildImageUrl, buildVideoUrl, CONSTANTS, type ReaderFile } from '@/types';

interface Props {
  files: string[];
  loadedCount: number;
  scale: number;
  hasChapter: boolean;
  series?: string;
  chapter?: string;
}

const props = withDefaults(defineProps<Props>(), {
  series: '',
  chapter: '',
});

const emit = defineEmits<{
  scroll: [data: { scrollTop: number; scrollHeight: number; clientHeight: number }];
  'load-more': [];
  'image-double-click': [imgElement: HTMLImageElement];
}>();

// DOM 引用
const readerEl = ref<HTMLDivElement | null>(null);

// 最后滚动位置
const lastScrollPos = ref(0);

// 是否显示加载指示器
const showLoadingIndicator = computed(() => {
  return props.hasChapter && props.loadedCount < props.files.length;
});

// 可见文件列表
const visibleFiles = computed<ReaderFile[]>(() => {
  const visible = props.files.slice(0, props.loadedCount);
  return visible.map((filename) => {
    const type = getFileType(filename);
    let url = '';

    if (type === 'image') {
      url = buildImageUrl(props.series, props.chapter, filename);
    } else if (type === 'video') {
      url = buildVideoUrl(props.series, props.chapter, filename);
    }

    return {
      filename,
      type,
      url,
    };
  });
});

// 滚动处理
function handleScroll(): void {
  if (!readerEl.value) return;

  const { scrollTop, scrollHeight, clientHeight } = readerEl.value;

  // 触发滚动事件
  emit('scroll', { scrollTop, scrollHeight, clientHeight });

  // 检测滚动方向并处理 Header/Footer
  const deltaY = scrollTop - lastScrollPos.value;

  if (Math.abs(deltaY) > CONSTANTS.SCROLL_DIRECTION_THRESHOLD) {
    lastScrollPos.value = scrollTop;
  }

  // 检测是否接近底部，触发加载更多
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - CONSTANTS.SCROLL_LOAD_THRESHOLD;

  if (isNearBottom && props.loadedCount < props.files.length) {
    emit('load-more');
  }
}

// 图片双击处理
function handleImageDoubleClick(imgElement: HTMLImageElement): void {
  emit('image-double-click', imgElement);
}

// 暴露方法
function scrollToTop(): void {
  readerEl.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollByPage(ratio: number): void {
  if (!readerEl.value) return;
  const scrollAmount = readerEl.value.clientHeight * ratio;
  readerEl.value.scrollBy({ top: scrollAmount, behavior: 'smooth' });
}

// 监听 files 变化，重置滚动位置
watch(() => props.files, () => {
  if (readerEl.value) {
    readerEl.value.scrollTop = 0;
  }
  lastScrollPos.value = 0;
});

defineExpose({
  scrollToTop,
  scrollByPage,
});
</script>
