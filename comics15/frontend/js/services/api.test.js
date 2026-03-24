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

    describe('buildHQImageUrl', () => {
        it('should build HQ image URL with chapterPath', () => {
            const url = api.buildHQImageUrl('Series', 'image.jpg', 'chapter1');
            expect(url).toBe('/hq_image/Series/chapter1/image.jpg');
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
});