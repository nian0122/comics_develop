import { defineStore } from 'pinia';
import { api } from '../services/api.js';
import { LAZY_LOAD_CONFIG, IMAGE_RETRY_CONFIG } from '../config/constants.js';

export const useReaderStore = defineStore('reader', {
    state: () => ({
        /** 当前章节文件列表 */
        files: [],
        /** 已加载的文件数量 */
        loadedCount: 0,
        /** 加载状态 */
        isLoading: false,
        /** 图片缩放比例 */
        scale: 100,
        /** 懒加载配置 */
        lazyConfig: LAZY_LOAD_CONFIG,
        /** 图片重试配置 */
        retryConfig: IMAGE_RETRY_CONFIG,
        /** 懒加载观察器 */
        lazyObserver: null,
        /** 懒加载下一个观察索引 */
        lazyNextIndex: 0,
        /** 懒加载已加载计数 */
        lazyLoadedCount: 0,
        /** 懒加载是否正在观察 */
        lazyIsObserving: false,
        /** 图片重试状态 Map: key = container, value = { retries, timeoutId } */
        imageRetry: new Map(),
        /** 错误信息 */
        error: null
    }),

    actions: {
        async loadFiles(seriesName, chapterPath) {
            this.isLoading = true;
            this.error = null;
            try {
                const data = await api.getChapterFiles(seriesName, chapterPath);
                this.files = data.files || [];
                this.loadedCount = 0;
                return this.files;
            } catch (e) {
                this.error = e.message || '获取章节文件失败';
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

        setFiles(files) {
            this.files = files;
            this.loadedCount = 0;
        },

        setLoadedCount(count) {
            this.loadedCount = Math.min(count, this.files.length);
        },

        incrementLoadedCount() {
            if (this.loadedCount < this.files.length) {
                this.loadedCount += 1;
            }
        },

        setScale(scale) {
            this.scale = Math.max(50, Math.min(200, scale));
        },

        setLazyObserver(observer) {
            this.lazyObserver = observer;
        },

        setLazyNextIndex(index) {
            this.lazyNextIndex = index;
        },

        setLazyLoadedCount(count) {
            this.lazyLoadedCount = count;
        },

        incrementLazyLoadedCount() {
            this.lazyLoadedCount += 1;
        },

        setLazyIsObserving(flag) {
            this.lazyIsObserving = flag;
        },

        setImageRetry(container, state) {
            this.imageRetry.set(container, state);
        },

        getImageRetry(container) {
            return this.imageRetry.get(container);
        },

        hasImageRetry(container) {
            return this.imageRetry.has(container);
        },

        clearImageRetry(container) {
            const state = this.imageRetry.get(container);
            if (state && state.timeoutId) {
                clearTimeout(state.timeoutId);
            }
            this.imageRetry.delete(container);
        },

        resetReader() {
            this.files = [];
            this.loadedCount = 0;
            this.isLoading = false;
            this.error = null;
        },

        resetLazyLoad() {
            if (this.lazyObserver) {
                this.lazyObserver.disconnect();
                this.lazyObserver = null;
            }
            this.imageRetry.forEach((state) => {
                if (state.timeoutId) {
                    clearTimeout(state.timeoutId);
                }
            });
            this.imageRetry.clear();
            this.lazyNextIndex = 0;
            this.lazyLoadedCount = 0;
            this.lazyIsObserving = false;
        },

        $reset() {
            this.resetLazyLoad();
            this.resetReader();
            this.scale = 100;
        }
    },

    getters: {
        hasFiles: (state) => state.files.length > 0,

        totalFiles: (state) => state.files.length,

        loadProgress: (state) => {
            if (state.files.length === 0) return 0;
            return Math.round((state.loadedCount / state.files.length) * 100);
        },

        hasMoreToLoad: (state) => state.loadedCount < state.files.length
    }
});