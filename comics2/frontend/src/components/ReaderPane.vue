<template>
  <div
    ref="scrollRef"
    class="relative h-[70vh] overflow-y-auto scrollbar-thin rounded-xl border border-slate-800 bg-slate-900/60"
    @scroll.passive="handleScroll"
  >
    <div v-if="loading" class="p-6 text-sm text-slate-300">正在载入章节内容...</div>
    <div v-else-if="files.length === 0" class="p-6 text-sm text-slate-400">
      选择章节后这里会显示图片 / 视频。
    </div>
    <div v-else class="space-y-6 px-4 py-6">
      <div
        v-for="file in files"
        :key="file"
        class="rounded-xl overflow-hidden bg-slate-950/60 border border-slate-800 shadow-lg shadow-black/30"
      >
        <img
          v-if="isImage(file)
            "
          :src="urlFor(file)"
          :alt="file"
          class="block w-full"
          :style="{ width: scale + '%' }"
          loading="lazy"
        />
        <video
          v-else
          class="w-full rounded-xl"
          controls
          preload="metadata"
        >
          <source :src="urlFor(file)" type="video/mp4" />
          你的浏览器不支持视频播放。
        </video>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  files: string[];
  urlFor: (file: string) => string;
  loading?: boolean;
  scale: number;
}>();

const emit = defineEmits<{ (e: 'reach-bottom'): void }>();

const scrollRef = ref<HTMLElement | null>(null);

const isImage = (file: string) => /\.(jpg|jpeg|png|webp)$/i.test(file);

const handleScroll = () => {
  const el = scrollRef.value;
  if (!el) return;
  const threshold = 120;
  if (el.scrollTop + el.clientHeight + threshold >= el.scrollHeight) {
    emit('reach-bottom');
  }
};

// Ensure we catch browser resize / initial fill
const onResize = () => handleScroll();

onMounted(() => {
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>
