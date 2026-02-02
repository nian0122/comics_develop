<!--
  对应原 HTML 逻辑块: #sidebar 容器
  - 系列列表区域
  - 章节过滤输入框
  - 章节目录区域
  - 侧边栏响应式样式
-->

<template>
  <div
    id="sidebar"
    class="fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-xl p-4 flex flex-col z-40 transition-transform duration-300 ease-in-out md:static md:w-72"
    :class="sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'"
  >
    <!-- 系列列表 -->
    <div class="top-hint text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">
      漫画系列
    </div>
    <div class="series-ratio-2 overflow-y-auto mb-2">
      <div v-if="series.length === 0 && !loading" class="p-2 text-gray-500">
        未找到任何漫画系列
      </div>
      <div v-else-if="loading" class="p-2 text-gray-500">
        正在加载...
      </div>
      <div v-else class="list-block space-y-1">
        <div
          v-for="s in series"
          :key="s"
          class="list-item series-item"
          :class="{ selected: s === currentSeries }"
          @click="$emit('select-series', s)"
        >
          {{ s }}
        </div>
      </div>
    </div>

    <hr class="border-gray-700 my-2" />

    <!-- 章节目录 -->
    <div class="top-hint text-xs font-semibold uppercase text-gray-400 tracking-wider mt-2">
      章节目录
    </div>
    <input
      v-model="localFilterText"
      class="search w-full p-2 mb-4 bg-gray-700 text-white border border-gray-600 rounded-lg placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
      placeholder="过滤章节名..."
    />
    <div class="chapters-ratio-3 overflow-y-auto">
      <div v-if="chapterTree.length === 0" class="p-2 text-gray-500">
        {{ currentSeries ? '此系列下没有找到任何章节' : '请选择一个系列' }}
      </div>
      <ChapterTree
        v-else
        :tree="filteredTree"
        :current-index="currentIndex"
        :filter-text="localFilterText"
        @select-chapter="$emit('select-chapter', $event)"
        @toggle-volume="$emit('toggle-volume', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ChapterTree from './ChapterTree.vue';
import type { ChapterNode } from '@/types';

interface Props {
  series: string[];
  chapterTree: ChapterNode[];
  currentSeries: string;
  currentIndex: number;
  filterText: string;
  expandedPaths: Record<string, boolean>;
  sidebarVisible: boolean;
  isMobile: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  'select-series': [name: string];
  'select-chapter': [index: number];
  'update:filter-text': [value: string];
  'toggle-volume': [fullPath: string];
}>();

// 本地过滤文本
const localFilterText = ref(props.filterText);

watch(localFilterText, (val) => {
  emit('update:filter-text', val);
});

watch(() => props.filterText, (val) => {
  localFilterText.value = val;
});

// 判断是否包含过滤后的章节
function containsFilteredChapters(node: ChapterNode, lowerFilter: string): boolean {
  if (node.isChapter) {
    return node.name.toLowerCase().includes(lowerFilter);
  }
  if (node.children.length > 0) {
    return node.children.some((child) => containsFilteredChapters(child, lowerFilter));
  }
  return false;
}

// 过滤树
const filteredTree = computed(() => {
  if (!localFilterText.value) return props.chapterTree;

  const lowerFilter = localFilterText.value.toLowerCase();

  const filterNode = (node: ChapterNode): ChapterNode | null => {
    if (!containsFilteredChapters(node, lowerFilter)) {
      return null;
    }

    if (node.isChapter) {
      if (!node.name.toLowerCase().includes(lowerFilter)) {
        return null;
      }
      return { ...node };
    }

    const filteredChildren = node.children
      .map((child) => filterNode(child))
      .filter((child): child is ChapterNode => child !== null);

    return {
      ...node,
      children: filteredChildren,
      isExpanded: true, // 过滤时强制展开
    };
  };

  return props.chapterTree
    .map((node) => filterNode(node))
    .filter((node): node is ChapterNode => node !== null);
});
</script>