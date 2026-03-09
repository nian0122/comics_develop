<script setup lang="ts">
import type { ChapterTreeNode } from '@/stores/series'

interface Props {
  seriesList: string[]
  currentSeries: string
  chapterTree: ChapterTreeNode[]
  currentChapterIndex: number
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select-series', name: string): void
  (e: 'select-chapter', index: number): void
  (e: 'toggle-volume', fullPath: string): void
}>()

function handleSeriesClick(name: string) {
  emit('select-series', name)
}

function handleChapterClick(index: number) {
  emit('select-chapter', index)
}

function handleVolumeClick(fullPath: string) {
  emit('toggle-volume', fullPath)
}

// 计算节点深度
function getNodeDepth(fullPath: string): number {
  return fullPath.split('/').length
}
</script>

<template>
  <div
    class="sidebar fixed inset-y-0 left-0 w-72 glass-strong rounded-r-2xl p-4 flex flex-col z-50 transition-transform duration-300 ease-in-out"
  >
    <!-- 系列列表 -->
    <div class="section-label mb-4 px-2">漫画系列</div>
    <div class="series-ratio-2 overflow-y-auto mb-4 glass rounded-xl p-2">
      <div id="seriesList" class="list-block space-y-1">
        <div v-if="isLoading" class="p-2 text-center" style="color: rgba(92, 85, 71, 0.7);">
          正在加载...
        </div>
        <div v-else-if="seriesList.length === 0" class="status-text" style="text-align: center;">
          未找到漫画系列
        </div>
        <div
          v-for="series in seriesList"
          :key="series"
          class="list-item series-item"
          :class="{ selected: series === currentSeries }"
          @click="handleSeriesClick(series)"
        >
          <div class="chapter-dot" />
          <span>{{ series }}</span>
        </div>
      </div>
    </div>

    <hr style="border: none; height: 1px; background: rgba(139, 119, 101, 0.15); margin: 16px 0;" />

    <!-- 章节列表 -->
    <div class="section-label mt-2 mb-3 px-2">章节目录</div>
    <input
      type="text"
      placeholder="过滤章节名..."
      class="search w-full glass-input rounded-lg mb-4"
    />
    <div class="chapters-ratio-3 overflow-y-auto glass rounded-xl p-2">
      <div id="chapters" class="list-block space-y-1">
        <div v-if="isLoading" class="status-text" style="text-align: center;">
          正在加载章节...
        </div>
        <div v-else-if="chapterTree.length === 0" class="status-text" style="text-align: center;">
          {{ currentSeries ? '暂无章节' : '请选择一个系列' }}
        </div>
        
        <!-- 递归渲染章节树 -->
        <template v-else>
          <template v-for="node in chapterTree" :key="node.fullPath">
            <!-- 卷/目录 -->
            <div v-if="!node.isChapter">
              <div
                class="volume-title"
                :class="{ collapsed: !node.isExpanded }"
                :style="{ paddingLeft: `${10 + (getNodeDepth(node.fullPath) - 1) * 15}px` }"
                @click.stop="handleVolumeClick(node.fullPath)"
              >
                <span class="toggle-icon">{{ node.isExpanded ? '▼' : '▶' }}</span>
                {{ node.name }}
              </div>
              
              <!-- 渲染子章节 -->
              <template v-if="node.isExpanded && node.children">
                <template v-for="childNode in (Array.isArray(node.children) ? node.children : Object.values(node.children))" :key="childNode.fullPath">
                  <div
                    v-if="childNode.isChapter"
                    class="list-item chapter-item"
                    :class="{ selected: childNode.flatIndex === currentChapterIndex }"
                    :style="{ paddingLeft: `${20 + (getNodeDepth(childNode.fullPath) - 1) * 15}px` }"
                    @click="handleChapterClick(childNode.flatIndex!)"
                  >
                    <div class="chapter-dot" />
                    <span>{{ childNode.name }}</span>
                  </div>
                </template>
              </template>
            </div>
            
            <!-- 直接显示的章节 -->
            <div
              v-else
              class="list-item chapter-item"
              :class="{ selected: node.flatIndex === currentChapterIndex }"
              :style="{ paddingLeft: '20px' }"
              @click="handleChapterClick(node.flatIndex!)"
            >
              <div class="chapter-dot" />
              <span>{{ node.name }}</span>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.series-ratio-2 {
  flex: 2;
  min-height: 0;
}

.chapters-ratio-3 {
  flex: 3;
  min-height: 0;
}
</style>
