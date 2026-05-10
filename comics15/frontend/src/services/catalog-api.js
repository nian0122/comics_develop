// 目录相关 API

import { MAX_IMAGES_TO_FETCH } from '../config/constants.js';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const catalogApi = {
    async getSeries() {
        const res = await fetch('/api/series');
        if (!res.ok) throw new ApiError('获取系列失败', res.status);
        return res.json();
    },

    async getChapterFiles(seriesName, chapterPath, page = 1, perPage = MAX_IMAGES_TO_FETCH) {
        const url = `/api/chapter/${encodeURIComponent(seriesName)}?chapterPath=${encodeURIComponent(chapterPath)}&page=${page}&per_page=${perPage}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取章节文件失败', res.status);
        return res.json();
    },

    async getLevelNodes(seriesName, path = '') {
        const url = `/api/levels/${encodeURIComponent(seriesName)}${path ? `?path=${encodeURIComponent(path)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取层级节点失败', res.status);
        const data = await res.json();
        return data.nodes || [];
    }
};