// API 服务封装

import { MAX_IMAGES_TO_FETCH } from '../config/constants.js';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

function encodePathSegments(path) {
    return (path || '')
        .replaceAll(String.fromCharCode(92), '/')
        .split('/')
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

function joinStaticUrl(prefix, seriesName, chapterPath, filename) {
    const encodedSeries = encodeURIComponent(seriesName);
    const encodedChapterPath = encodePathSegments(chapterPath);
    const encodedFilename = encodeURIComponent(filename);
    return encodedChapterPath
        ? `${prefix}/${encodedSeries}/${encodedChapterPath}/${encodedFilename}`
        : `${prefix}/${encodedSeries}/${encodedFilename}`;
}

export const api = {
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

    buildImageUrl(seriesName, filename, chapterPath) {
        const base = `/api/image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`;
        return chapterPath ? `${base}?chapterPath=${encodeURIComponent(chapterPath)}` : base;
    },

    buildLQImageUrl(seriesName, filename, chapterPath) {
        const dotIndex = filename.lastIndexOf('.');
        const baseName = dotIndex > -1 ? filename.substring(0, dotIndex) : filename;
        return joinStaticUrl('/lq_image', seriesName, chapterPath, `${baseName}.webp`);
    },

    buildHQImageUrl(seriesName, filename, chapterPath) {
        return joinStaticUrl('/hq_image', seriesName, chapterPath, filename);
    },

    buildVideoUrl(seriesName, filename, chapterPath) {
        return joinStaticUrl('/video', seriesName, chapterPath, filename);
    },

    /**
     * 检查 LQ 图片是否存在
     * @returns {Promise<boolean>} true = 图片存在 (200), false = 不存在 (204)
     */
    getHQImageUrlFromLQ(lqUrl) {
        try {
            const url = new URL(lqUrl, window.location.origin);
            if (!url.pathname.startsWith('/api/image/')) return lqUrl;

            const parts = url.pathname.replace('/api/image/', '').split('/');
            const seriesName = decodeURIComponent(parts[0] || '');
            const filename = decodeURIComponent(parts[1] || '');
            const chapterPath = url.searchParams.get('chapterPath') || '';
            return this.buildHQImageUrl(seriesName, filename, chapterPath);
        } catch {
            return lqUrl;
        }
    },

    async checkLQImageExists(lqUrl) {
        try {
            const res = await fetch(lqUrl, { method: 'HEAD' });
            return res.status === 200;
        } catch {
            return false;
        }
    },

    async checkHQImageUsable(hqUrl) {
        try {
            const res = await fetch(hqUrl, { method: 'HEAD' });
            if (!res.ok || res.status === 204) return false;

            const contentLength = res.headers.get('content-length') ?? res.headers.get('Content-Length');
            if (contentLength == null) return true;
            const size = Number.parseInt(contentLength, 10);
            return Number.isNaN(size) || size > 0;
        } catch {
            return false;
        }
    },

    async resolveImageUrl(seriesName, filename, chapterPath) {
        const lqUrl = this.buildLQImageUrl(seriesName, filename, chapterPath);
        const lqExists = await this.checkLQImageExists(lqUrl);

        if (lqExists) {
            return {
                url: lqUrl,
                source: 'lq',
            };
        }

        return {
            url: this.buildHQImageUrl(seriesName, filename, chapterPath),
            source: 'hq',
        };
    },

    async getLevelNodes(seriesName, path = '') {
        const url = `/api/levels/${encodeURIComponent(seriesName)}${path ? `?path=${encodeURIComponent(path)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取层级节点失败', res.status);
        return res.json();
    }
};