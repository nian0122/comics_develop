// API 服务封装

import { MAX_IMAGES_TO_FETCH } from '../config/constants.js';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const api = {
    async getSeries() {
        const res = await fetch('/api/series');
        if (!res.ok) throw new ApiError('获取系列失败', res.status);
        return res.json();
    },

    async getChapters(seriesName) {
        const res = await fetch(`/api/chapters/${encodeURIComponent(seriesName)}`);
        if (!res.ok) throw new ApiError('获取章节失败', res.status);
        return res.json();
    },

    async getChapterFiles(seriesName, chapterPath, page = 1, perPage = MAX_IMAGES_TO_FETCH) {
        const url = `/api/chapter/${encodeURIComponent(seriesName)}?chapterPath=${encodeURIComponent(chapterPath)}&page=${page}&per_page=${perPage}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取章节文件失败', res.status);
        return res.json();
    },

    buildLQImageUrl(seriesName, filename, chapterPath) {
        const baseName = filename.substring(0, filename.lastIndexOf('.'));
        return chapterPath
            ? `/lq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(chapterPath)}/${encodeURIComponent(baseName)}.webp`
            : `/lq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(baseName)}.webp`;
    },

    buildHQImageUrl(seriesName, filename, chapterPath) {
        return chapterPath
            ? `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(chapterPath)}/${encodeURIComponent(filename)}`
            : `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`;
    },

    buildVideoUrl(seriesName, filename, chapterPath) {
        return chapterPath
            ? `/video/${encodeURIComponent(seriesName)}/${encodeURIComponent(chapterPath)}/${encodeURIComponent(filename)}`
            : `/video/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`;
    }
};