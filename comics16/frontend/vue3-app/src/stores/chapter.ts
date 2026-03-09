/**
 * 章节数据状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChapterData, ChapterTreeNode } from './series'
import { naturalSort } from '@/utils/naturalSort'
import { loadExpandedPaths, saveExpandedPaths } from '@/utils/storage'

export interface ChapterFileResponse {
  files: string[]
  total?: number
  page?: number
  per_page?: number
}

export const useChapterStore = defineStore('chapter', () => {
  // State
  const allChapters = ref<ChapterData[]>([])
  const chapterTree = ref<ChapterTreeNode[]>([])
  const currentChapterIndex = ref(-1)
  const chapterFiles = ref<string[]>([])
  const isLoading = ref(false)
  const isLoadingFiles = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasChapters = computed(() => allChapters.value.length > 0)
  const hasSelectedChapter = computed(() => currentChapterIndex.value >= 0)
  const currentChapter = computed(() => 
    currentChapterIndex.value >= 0 && currentChapterIndex.value < allChapters.value.length
      ? allChapters.value[currentChapterIndex.value]
      : null
  )
  const currentChapterName = computed(() => currentChapter.value?.name || '')
  const currentChapterPathId = computed(() => currentChapter.value?.path_id || '')
  const totalPages = computed(() => chapterFiles.value.length)
  const nextChapterIndex = computed(() => currentChapterIndex.value + 1)
  const hasMoreChapters = computed(() => nextChapterIndex.value < allChapters.value.length)

  // Actions
  async function loadChapters(seriesName: string): Promise<void> {
    if (!seriesName) {
      allChapters.value = []
      chapterTree.value = []
      return
    }

    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(`/api/chapters/${encodeURIComponent(seriesName)}`)
      if (!response.ok) {
        throw new Error('Failed to load chapters')
      }
      
      const data = await response.json()
      allChapters.value = data
      
      // 构建树形结构
      chapterTree.value = buildChapterTree(data)
      
      // 重置当前章节
      currentChapterIndex.value = -1
      chapterFiles.value = []
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载章节列表失败'
      console.error('Error loading chapters:', e)
    } finally {
      isLoading.value = false
    }
  }

  function buildChapterTree(flatChapters: ChapterData[]): ChapterTreeNode[] {
    const root: { name: string; children: Record<string, any> } = { name: 'root', children: {} }
    const expandedPaths = loadExpandedPaths()

    flatChapters.forEach((chapter, index) => {
      const parts = chapter.path_id.split(/[\\/]/).filter(p => p)
      let current = root
      let fullPath = ''

      parts.forEach((part, i) => {
        fullPath = fullPath ? `${fullPath}/${part}` : part

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath,
            children: {},  // 使用对象而不是数组，与 root 保持一致
            isChapter: i === parts.length - 1,
            flatIndex: i === parts.length - 1 ? index : null,
            path_id: i === parts.length - 1 ? chapter.path_id : null,
            isExpanded: expandedPaths[fullPath] !== false,
          }
        }
        current = current.children[part]
      })
    })

    // 排序并转换为数组
    const sortNode = (node: ChapterTreeNode) => {
      // 如果是对象，先转换为数组
      const childrenArray = Array.isArray(node.children) 
        ? node.children 
        : Object.values(node.children)
      
      if (childrenArray.length > 0) {
        childrenArray.sort((a, b) => naturalSort(a.name, b.name))
        childrenArray.forEach(sortNode)
        // 将排序后的数组赋值回 children
        node.children = childrenArray
      }
    }

    const childrenArray = Object.values(root.children)
    childrenArray.forEach(sortNode)
    
    return childrenArray
  }

  // 用于取消异步请求的标记
  let abortController: AbortController | null = null
  let currentLoadPromise: Promise<string[]> | null = null

  async function loadChapterFiles(seriesName: string, chapterPath: string): Promise<string[]> {
    // 取消之前的请求
    if (abortController) {
      abortController.abort()
    }
    abortController = new AbortController()
    
    // 安全检查：防止在无效状态下加载
    if (!seriesName || !chapterPath) {
      console.warn('[loadChapterFiles] Invalid parameters:', { seriesName, chapterPath })
      chapterFiles.value = []
      return []
    }
    
    isLoadingFiles.value = true
    error.value = null
    
    try {
      const MAX_IMAGES_TO_FETCH = 500
      const response = await fetch(
        `/api/chapter/${encodeURIComponent(seriesName)}?chapterPath=${encodeURIComponent(chapterPath)}&page=1&per_page=${MAX_IMAGES_TO_FETCH}`,
        { signal: abortController.signal }
      )
      
      if (!response.ok) {
        throw new Error('Failed to load chapter files')
      }
      
      const data: ChapterFileResponse = await response.json()
      
      // 检查请求是否被取消
      if (abortController?.signal.aborted) {
        console.log('[loadChapterFiles] Request was aborted, skipping update')
        return []
      }
      
      chapterFiles.value = data.files || []
      
      return chapterFiles.value
    } catch (e) {
      // 忽略取消的请求
      if (e instanceof Error && e.name === 'AbortError') {
        console.log('[loadChapterFiles] Request cancelled')
        return []
      }
      
      // 只在非取消错误时更新错误状态
      if (!abortController?.signal.aborted) {
        error.value = e instanceof Error ? e.message : '加载章节文件失败'
        console.error('Error loading chapter files:', e)
        chapterFiles.value = []
      }
      return []
    } finally {
      // 只在非取消时重置加载状态
      if (!abortController?.signal.aborted) {
        isLoadingFiles.value = false
      }
    }
  }


  function selectChapter(index: number): void {
    if (index >= 0 && index < allChapters.value.length) {
      currentChapterIndex.value = index
      // 选择新章节时清空文件列表，避免显示旧数据
      chapterFiles.value = []
    }
  }


  function toggleVolume(fullPath: string): void {
    const toggleInTree = (nodes: ChapterTreeNode[]): boolean => {
      for (const node of nodes) {
        if (node.fullPath === fullPath) {
          node.isExpanded = !node.isExpanded
          
          // 保存展开状态
          const expandedPaths = loadExpandedPaths()
          expandedPaths[fullPath] = node.isExpanded
          saveExpandedPaths(expandedPaths)
          return true
        }
        if (node.children && node.children.length > 0) {
          if (toggleInTree(node.children)) return true
        }
      }
      return false
    }

    toggleInTree(chapterTree.value)
  }

  function resetChapters(): void {
    allChapters.value = []
    chapterTree.value = []
    currentChapterIndex.value = -1
    chapterFiles.value = []
    error.value = null
  }

  return {
    // State
    allChapters,
    chapterTree,
    currentChapterIndex,
    chapterFiles,
    isLoading,
    isLoadingFiles,
    error,
    // Computed
    hasChapters,
    hasSelectedChapter,
    currentChapter,
    currentChapterName,
    currentChapterPathId,
    totalPages,
    nextChapterIndex,
    hasMoreChapters,
    // Actions
    loadChapters,
    loadChapterFiles,
    selectChapter,
    toggleVolume,
    resetChapters,
  }
})
