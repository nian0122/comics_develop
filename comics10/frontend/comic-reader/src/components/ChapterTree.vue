<!--
  对应原 HTML 逻辑块: renderChapters(), renderNode()
  - 递归渲染章节树形结构
  - 处理卷的展开/折叠
  - 处理章节选择
  - 过滤显示逻辑
-->

<template>
  <div class="list-block space-y-1">
    <template v-for="node in tree" :key="node.fullPath">
      <!-- 卷/目录节点 -->
      <div
        v-if="!node.isChapter"
        class="volume-title"
        :class="{ collapsed: !node.isExpanded }"
        :style="{ paddingLeft: `${10 + getDepth(node) * 15}px` }"
        @click="handleToggleVolume(node)"
      >
        <span class="toggle-icon">{{ node.isExpanded ? '▼' : '▶' }}</span>
        {{ node.name }}
      </div>

      <!-- 递归渲染子节点 -->
      <template v-if="!node.isChapter && node.isExpanded">
        <ChapterTree
          :tree="node.children"
          :current-index="currentIndex"
          :filter-text="filterText"
          :parent-depth="getDepth(node) + 1"
          @select-chapter="$emit('select-chapter', $event)"
          @toggle-volume="$emit('toggle-volume', $event)"
        />
      </template>

      <!-- 章节节点 -->
      <div
        v-if="node.isChapter"
        class="list-item chapter-item"
        :class="{ selected: node.flatIndex === currentIndex }"
        :style="{ paddingLeft: `${20 + getDepth(node) * 15}px` }"
        @click="handleSelectChapter(node)"
      >
        <div class="chapter-dot"></div>
        <span>{{ node.name }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ChapterNode } from '@/types';

interface Props {
  tree: ChapterNode[];
  currentIndex: number;
  filterText: string;
  parentDepth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  parentDepth: 0,
});

const emit = defineEmits<{
  'select-chapter': [index: number];
  'toggle-volume': [fullPath: string];
}>();

// 获取节点深度
function getDepth(_node: ChapterNode): number {
  return props.parentDepth;
}

// 处理卷展开/折叠
function handleToggleVolume(node: ChapterNode): void {
  // 有过滤文本时，不处理折叠
  if (props.filterText) return;

  emit('toggle-volume', node.fullPath);
}

// 处理章节选择
function handleSelectChapter(node: ChapterNode): void {
  if (node.flatIndex !== null) {
    emit('select-chapter', node.flatIndex);
  }
}
</script>