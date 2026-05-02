// 章节元数据缓存模块

import { store } from '../state/store.js';
import { getChapterCoverMeta } from '../utils/chapter-cover-meta.js';

export class ChapterMetaCache {
    constructor() {
        this.cache = new Map();
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
        return meta;
    }
}