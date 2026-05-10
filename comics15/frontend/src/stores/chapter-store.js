import { defineStore } from 'pinia';
import { api } from '../services/index.js';
import { buildChapterTree } from '../utils/chapter-tree.js';
import { ChapterMetaCache } from '../services/chapter-meta-cache.js';

export const useChapterStore = defineStore('chapters', {
    state: () => ({
        /** 章节扁平列表 */
        flatList: [],
        /** 章节树结构 */
        tree: [],
        /** 当前章节索引（在 flatList 中的位置） */
        currentIndex: -1,
        /** 层级节点缓存 */
        levelCache: new Map(),
        /** 章节元数据缓存实例 */
        metaCache: new ChapterMetaCache(),
        /** 加载状态 */
        loading: false,
        /** 错误信息 */
        error: null
    }),

    actions: {
        async loadChapters(seriesName) {
            this.loading = true;
            this.error = null;
            this.metaCache.clear();
            this.levelCache.clear();
            try {
                const allChapters = [];
                await this.collectAllChapters(seriesName, '', allChapters);
                this.flatList = allChapters;
                this.tree = buildChapterTree(this.flatList);
                return { flatList: this.flatList, tree: this.tree };
            } catch (e) {
                this.error = e.message || '获取章节失败';
                throw e;
            } finally {
                this.loading = false;
            }
        },

        async collectAllChapters(seriesName, path, allChapters) {
            const nodes = await this.loadLevelNodes(seriesName, path);
            for (const node of nodes) {
                if (node.type === 'chapter') {
                    allChapters.push(node);
                } else if (node.type === 'directory') {
                    const childPath = path ? `${path}/${node.name}` : node.name;
                    await this.collectAllChapters(seriesName, childPath, allChapters);
                }
            }
        },

        async loadLevelNodes(seriesName, path = '') {
            const cached = this.levelCache.get(path);
            if (cached) {
                return cached;
            }
            const nodes = await api.getLevelNodes(seriesName, path);
            this.levelCache.set(path, nodes);
            return nodes;
        },

        setCurrentChapterIndex(index) {
            if (index >= 0 && index < this.flatList.length) {
                this.currentIndex = index;
            } else {
                this.currentIndex = -1;
            }
        },

        setCurrentChapterByPathId(pathId) {
            const index = this.flatList.findIndex(ch => ch.path_id === pathId);
            this.setCurrentChapterIndex(index);
        },

        setLevelCache(path, nodes) {
            this.levelCache.set(path, nodes);
        },

        getLevelCache(path) {
            return this.levelCache.get(path);
        },

        clearLevelCache() {
            this.levelCache.clear();
        },

        clearMetaCache() {
            this.metaCache.clear();
        },

        getChapterAtIndex(index) {
            return this.flatList[index] || null;
        },

        getCurrentChapter() {
            return this.getChapterAtIndex(this.currentIndex);
        },

        getNextChapter() {
            if (this.currentIndex < 0 || this.currentIndex >= this.flatList.length - 1) {
                return null;
            }
            return this.flatList[this.currentIndex + 1];
        },

        getPrevChapter() {
            if (this.currentIndex <= 0) {
                return null;
            }
            return this.flatList[this.currentIndex - 1];
        },

        async getChapterMeta(index) {
            return this.metaCache.getOrFetch(index);
        },

        async getChapterMetaByPathId(pathId) {
            return this.metaCache.getOrFetchByPathId(pathId);
        },

        $reset() {
            this.flatList = [];
            this.tree = [];
            this.currentIndex = -1;
            this.levelCache.clear();
            this.metaCache.clear();
            this.loading = false;
            this.error = null;
        }
    },

    getters: {
        hasChapters: (state) => state.flatList.length > 0,

        currentChapter: (state) => {
            if (state.currentIndex < 0 || state.currentIndex >= state.flatList.length) {
                return null;
            }
            return state.flatList[state.currentIndex];
        },

        totalChapters: (state) => state.flatList.length,

        hasNextChapter: (state) => state.currentIndex >= 0 && state.currentIndex < state.flatList.length - 1,

        hasPrevChapter: (state) => state.currentIndex > 0
    }
});
