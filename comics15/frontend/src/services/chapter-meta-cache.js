// 章节元数据缓存模块

import { store } from '../stores/store.js';
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

    async getOrFetch(index) {
        if (this.cache.has(index)) {
            return this.cache.get(index);
        }

        const chapter = store.chapters.flatList[index];
        const fallback = { totalPages: 0, files: [], coverUrl: '', coverSource: '' };
        if (!chapter) {
            return fallback;
        }

        const seriesName = store.series.current;
        const meta = getChapterCoverMeta(chapter, seriesName);
        this.cache.set(index, meta);
        this.pathIdCache.set(chapter.path_id, meta);
        return meta;
    }

    async getOrFetchByPathId(pathId) {
        if (this.pathIdCache.has(pathId)) {
            return this.pathIdCache.get(pathId);
        }

        const fallback = { totalPages: 0, files: [], coverUrl: '', coverSource: '' };

        const chapter = store.chapters.flatList.find(ch => ch.path_id === pathId);
        if (!chapter) {
            return fallback;
        }

        const seriesName = store.series.current;
        const meta = getChapterCoverMeta(chapter, seriesName);
        this.pathIdCache.set(pathId, meta);
        return meta;
    }
}