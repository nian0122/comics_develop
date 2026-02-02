<script setup lang="ts">
import { ref } from 'vue'
import HeaderBar from '@/components/HeaderBar.vue'
import FooterBar from '@/components/FooterBar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Reader from '@/components/Reader.vue'

// 临时数据，实际应用中这些应该从状态管理中获取
const series = ref<string[]>([])
const chapterTree = ref<any[]>([])
const currentSeries = ref<string>('')
const currentIndex = ref<number>(-1)
const filterText = ref<string>('')
const expandedPaths = ref<Record<string, boolean>>({})
const sidebarVisible = ref<boolean>(true)
const isMobile = ref<boolean>(false)
const seriesTitle = ref<string>('本地漫画阅读器')
const chapterTitle = ref<string>('')
const scale = ref<number>(100)
const canPrev = ref<boolean>(false)
const canNext = ref<boolean>(false)
const headerVisible = ref<boolean>(true)
const files = ref<string[]>([])
const loadedCount = ref<number>(0)
const hasChapter = ref<boolean>(false)
const status = ref<string>('未加载')
const totalCount = ref<number>(0)
const footerVisible = ref<boolean>(true)
</script>


<template>
  <div class="flex h-screen bg-gray-900 text-gray-100">
    <Sidebar 
      :series="series"
      :chapter-tree="chapterTree"
      :current-series="currentSeries"
      :current-index="currentIndex"
      :filter-text="filterText"
      :expanded-paths="expandedPaths"
      :sidebar-visible="sidebarVisible"
      :is-mobile="isMobile"
    />
    <main class="flex-1 flex flex-col">
      <HeaderBar 
        :series-title="seriesTitle"
        :chapter-title="chapterTitle"
        :scale="scale"
        :can-prev="canPrev"
        :can-next="canNext"
        :header-visible="headerVisible"
      />
      <Reader 
        :files="files"
        :loaded-count="loadedCount"
        :scale="scale"
        :has-chapter="hasChapter"
      />
      <FooterBar 
        :status="status"
        :loaded-count="loadedCount"
        :total-count="totalCount"
        :footer-visible="footerVisible"
      />
    </main>
  </div>
</template>