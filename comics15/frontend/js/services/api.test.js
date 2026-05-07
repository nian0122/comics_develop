import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from './api.js';

describe('api', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getSeries', () => {
        it('should return series list on success', async () => {
            const mockSeries = ['Series1', 'Series2'];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSeries)
            });

            const result = await api.getSeries();
            expect(result).toEqual(mockSeries);
            expect(fetch).toHaveBeenCalledWith('/api/series');
        });

        it('should throw ApiError on failure', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 500 });

            await expect(api.getSeries()).rejects.toThrow(ApiError);
        });
    });

    describe('getChapters', () => {
        it('should encode series name', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });

            await api.getChapters('测试系列');

            expect(fetch).toHaveBeenCalledWith('/api/chapters/%E6%B5%8B%E8%AF%95%E7%B3%BB%E5%88%97');
        });

        it('should preserve optional cover metadata from chapters response', async () => {
            const mockChapters = [
                { path_id: '第 1 话', name: '第 1 话', cover_file: '001.jpg', cover_source: 'lq', total_files: '32' },
                { path_id: '第 2 话', name: '第 2 话' },
            ];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockChapters)
            });

            await expect(api.getChapters('Series')).resolves.toEqual(mockChapters);
        });
    });

    describe('buildImageUrl', () => {
        it('should build correct image URL with chapterPath', () => {
            const url = api.buildImageUrl('Series', 'image.jpg', 'chapter1');
            expect(url).toBe('/api/image/Series/image.jpg?chapterPath=chapter1');
        });

        it('should encode special characters', () => {
            const url = api.buildImageUrl('测试', '图片.jpg', '章节1');
            expect(url).toContain('%E6%B5%8B%E8%AF%95');
            expect(url).toContain('%E5%9B%BE%E7%89%87');
        });
    });

    describe('buildLQImageUrl', () => {
        it('should keep multi-level chapter paths as URL segments', () => {
            const url = api.buildLQImageUrl('测试系列', '001.jpg', '第一卷/第 001 话');
            expect(url).toBe('/lq_image/%E6%B5%8B%E8%AF%95%E7%B3%BB%E5%88%97/%E7%AC%AC%E4%B8%80%E5%8D%B7/%E7%AC%AC%20001%20%E8%AF%9D/001.webp');
            expect(url).not.toContain('%2F');
        });

        it('should normalize Windows chapter separators for static image paths', () => {
            const url = api.buildLQImageUrl('Series', '001.png', `Volume 1${String.fromCharCode(92)}Chapter 1`);
            expect(url).toBe('/lq_image/Series/Volume%201/Chapter%201/001.webp');
        });
    });

    describe('buildHQImageUrl', () => {
        it('should build HQ image URL with chapterPath', () => {
            const url = api.buildHQImageUrl('Series', 'image.jpg', 'chapter1');
            expect(url).toBe('/hq_image/Series/chapter1/image.jpg');
        });

        it('should keep multi-level chapter paths as URL segments', () => {
            const url = api.buildHQImageUrl('测试系列', '图片 01.jpg', '第一卷/第 001 话');
            expect(url).toBe('/hq_image/%E6%B5%8B%E8%AF%95%E7%B3%BB%E5%88%97/%E7%AC%AC%E4%B8%80%E5%8D%B7/%E7%AC%AC%20001%20%E8%AF%9D/%E5%9B%BE%E7%89%87%2001.jpg');
            expect(url).not.toContain('%2F');
        });

        it('should build HQ image URL without chapterPath', () => {
            const url = api.buildHQImageUrl('Series', 'image.jpg', '');
            expect(url).toBe('/hq_image/Series/image.jpg');
        });
    });

    describe('buildVideoUrl', () => {
        it('should build video URL with chapterPath', () => {
            const url = api.buildVideoUrl('Series', 'video.mp4', 'chapter1');
            expect(url).toBe('/video/Series/chapter1/video.mp4');
        });

        it('should keep multi-level chapter paths as URL segments', () => {
            const url = api.buildVideoUrl('Series', 'clip.mp4', '第一卷/第 001 话');
            expect(url).toBe('/video/Series/%E7%AC%AC%E4%B8%80%E5%8D%B7/%E7%AC%AC%20001%20%E8%AF%9D/clip.mp4');
            expect(url).not.toContain('%2F');
        });
    });



    describe('checkHQImageUsable', () => {
        it('should treat non-empty HQ images as usable', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-length', '2048']]),
            });

            await expect(api.checkHQImageUsable('/hq_image/Series/chapter1/001.jpg')).resolves.toBe(true);
        });

        it('should treat empty HQ placeholder files as unusable', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-length', '0']]),
            });

            await expect(api.checkHQImageUsable('/hq_image/Series/chapter1/001.jpg')).resolves.toBe(false);
        });

        it('should treat missing content-length as usable to avoid hiding valid static files', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map(),
            });

            await expect(api.checkHQImageUsable('/hq_image/Series/chapter1/001.jpg')).resolves.toBe(true);
        });
    });

    describe('resolveImageUrl', () => {
        it('should prefer LQ webp when the compressed image exists', async () => {
            fetch.mockResolvedValueOnce({ status: 200 });

            const result = await api.resolveImageUrl('Series', '001.jpg', 'chapter1');

            expect(fetch).toHaveBeenCalledWith('/lq_image/Series/chapter1/001.webp', { method: 'HEAD' });
            expect(result).toEqual({
                url: '/lq_image/Series/chapter1/001.webp',
                source: 'lq',
            });
        });

        it('should fall back to HQ when the compressed image is missing', async () => {
            fetch.mockResolvedValueOnce({ status: 204 });

            const result = await api.resolveImageUrl('Series', '001.jpg', 'chapter1');

            expect(result).toEqual({
                url: '/hq_image/Series/chapter1/001.jpg',
                source: 'hq',
            });
        });

        it('should use LQ for HQ placeholder files when LQ exists', async () => {
            fetch.mockResolvedValueOnce({ status: 200 });

            const result = await api.resolveImageUrl('Series', 'placeholder.jpg', 'chapter1');

            expect(result.source).toBe('lq');
            expect(result.url).toBe('/lq_image/Series/chapter1/placeholder.webp');
        });
    });

    describe('getHQImageUrlFromLQ', () => {
        it('should convert LQ URL to HQ URL', () => {
            const lqUrl = 'http://localhost:3000/api/image/Series/image.jpg?chapterPath=chapter1';
            const hqUrl = api.getHQImageUrlFromLQ(lqUrl);
            expect(hqUrl).toBe('/hq_image/Series/chapter1/image.jpg');
        });

        it('should return original URL if not an API image', () => {
            const url = 'http://example.com/other/image.jpg';
            expect(api.getHQImageUrlFromLQ(url)).toBe(url);
        });
    });

    describe('getLevelNodes', () => {
        it('should fetch level nodes for root path', async () => {
            const mockResponse = {
                path: '',
                nodes: [{ type: 'directory', name: '第一卷' }]
            };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await api.getLevelNodes('海贼王');

            expect(fetch).toHaveBeenCalledWith('/api/levels/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
            expect(result).toEqual(mockResponse);
            expect(result.path).toBe('');
            expect(result.nodes).toHaveLength(1);
        });

        it('should fetch level nodes for specific path', async () => {
            const mockResponse = {
                path: '第一卷',
                nodes: [{ type: 'chapter', name: '第 001 话' }]
            };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await api.getLevelNodes('海贼王', '第一卷');

            expect(fetch).toHaveBeenCalledWith('/api/levels/%E6%B5%B7%E8%B4%BC%E7%8E%8B?path=%E7%AC%AC%E4%B8%80%E5%8D%B7');
            expect(result).toEqual(mockResponse);
            expect(result.path).toBe('第一卷');
        });

        it('should throw ApiError on failure', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 500 });

            await expect(api.getLevelNodes('Test')).rejects.toThrow(ApiError);
        });
    });
});