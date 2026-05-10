// 章节元数据缓存模块

import { getChapterCoverMeta } from '../utils/chapter-cover-meta.js';

export class ChapterMetaCache {
    constructor() {
        this.cache = new Map();
        this.pathIdCache = new Map();
    }

    has(index) {
        return this.cache.has(index);
    }

    get(index) {
        return this.cache.get(index);
    }

    set(index, meta) {
        this.cache.set(index, meta);
    }

    clear() {
        this.cache.clear();
        this.pathIdCache.clear();
    }

    /**
     * 获取或缓存章节元数据
     * @param {number} index - 章节在 flatList 中的索引
     * @param {Object} chapter - 章节数据对象
     * @param {string} seriesName - 系列名称
     * @returns {Object} 章节元数据
     */
    async getOrFetch(index, chapter, seriesName) {
        if (this.cache.has(index)) {
            return this.cache.get(index);
        }

        const fallback = { totalPages: 0, files: [], coverUrl: '', coverSource: '' };
        if (!chapter) {
            return fallback;
        }

        const meta = getChapterCoverMeta(chapter, seriesName);
        this.cache.set(index, meta);
        this.pathIdCache.set(chapter.path_id, meta);
        return meta;
    }

    /**
     * 通过 pathId 获取或缓存章节元数据
     * @param {string} pathId - 章节 pathId
     * @param {Object} chapter - 章节数据对象
     * @param {string} seriesName - 系列名称
     * @returns {Object} 章节元数据
     */
    async getOrFetchByPathId(pathId, chapter, seriesName) {
        if (this.pathIdCache.has(pathId)) {
            return this.pathIdCache.get(pathId);
        }

        const fallback = { totalPages: 0, files: [], coverUrl: '', coverSource: '' };

        if (!chapter) {
            return fallback;
        }

        const meta = getChapterCoverMeta(chapter, seriesName);
        this.pathIdCache.set(pathId, meta);
        return meta;
    }
}