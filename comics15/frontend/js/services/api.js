// API 服务封装

import { MAX_IMAGES_TO_FETCH } from '../config/constants.js';
import { useVideoPath } from '../utils/file-type.js';

const API_BASE = 'http://localhost:500/api';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const api = {
    async getSeries() {
        const res = await fetch(`${API_BASE}/series`);
        if (!res.ok) throw new ApiError('获取系列失败', res.status);
        return res.json();
    },

    async getChapters(seriesName) {
        const res = await fetch(`${API_BASE}/chapters/${encodeURIComponent(seriesName)}`);
        if (!res.ok) throw new ApiError('获取章节失败', res.status);
        return res.json();
    },

    async getChapterFiles(seriesName, chapterPath, page = 1, perPage = MAX_IMAGES_TO_FETCH) {
        const url = `${API_BASE}/chapter/${encodeURIComponent(seriesName)}?chapterPath=${encodeURIComponent(chapterPath)}&page=${page}&per_page=${perPage}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取章节文件失败', res.status);
        return res.json();
    },

    buildImageUrl(seriesName, filename, chapterPath) {
        return `${API_BASE}/image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}?chapterPath=${encodeURIComponent(chapterPath)}`;
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
    },

    buildMediaUrl(filename, pathId, seriesName, isVideo) {
        if (isVideo) {
            return this.buildVideoUrl(seriesName, filename, pathId);
        }
        return this.buildImageUrl(seriesName, filename, pathId);
    },

    getHQImageUrlFromLQ(lowQualityUrl) {
        if (!lowQualityUrl.includes('/api/image/')) return lowQualityUrl;

        try {
            const url = new URL(lowQualityUrl, window.location.origin);
            const seriesName = decodeURIComponent(url.pathname.split('/')[3]);
            const filename = decodeURIComponent(url.pathname.split('/')[4]);
            const chapterPath = url.searchParams.get('chapterPath')
                ? decodeURIComponent(url.searchParams.get('chapterPath'))
                : '';

            return this.buildHQImageUrl(seriesName, filename, chapterPath);
        } catch (e) {
            console.error('Error parsing URL for HQ image:', e);
            return lowQualityUrl.replace('/api/image/', '/hq_image/');
        }
    }
};