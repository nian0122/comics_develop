import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterMetaCache } from './chapter-meta-cache.js';
import { getChapterCoverMeta } from '../utils/chapter-cover-meta.js';

vi.mock('../utils/chapter-cover-meta.js', () => ({
    getChapterCoverMeta: vi.fn((chapter, seriesName) => ({
        totalPages: chapter?.total_files || 0,
        files: [],
        coverUrl: chapter?.cover_file ? `http://example.com/${seriesName}/${chapter.cover_file}` : '',
        coverSource: chapter?.cover_source || '',
    })),
}));

describe('ChapterMetaCache', () => {
    let cache;

    beforeEach(() => {
        cache = new ChapterMetaCache();
        vi.clearAllMocks();
    });

    it('should start with empty cache', () => {
        expect(cache.cache.size).toBe(0);
        expect(cache.has(0)).toBe(false);
    });

    it('should set and get values from cache', () => {
        const meta = { totalPages: 10, files: [], coverUrl: 'test', coverSource: 'hq' };
        cache.set(0, meta);
        expect(cache.has(0)).toBe(true);
        expect(cache.get(0)).toEqual(meta);
    });

    it('should clear cache', () => {
        cache.set(0, { totalPages: 5 });
        cache.set(1, { totalPages: 10 });
        expect(cache.cache.size).toBe(2);
        cache.clear();
        expect(cache.cache.size).toBe(0);
        expect(cache.has(0)).toBe(false);
        expect(cache.has(1)).toBe(false);
    });

    it('should return cached value without fetching', async () => {
        const cachedMeta = { totalPages: 20, files: ['a.jpg'], coverUrl: '', coverSource: '' };
        cache.set(5, cachedMeta);

        const chapter = { path_id: 'test', cover_file: 'test.jpg' };
        const result = await cache.getOrFetch(5, chapter, 'TestSeries');
        expect(result).toEqual(cachedMeta);
        expect(getChapterCoverMeta).not.toHaveBeenCalled();
    });

    it('should fetch chapter metadata and cache it', async () => {
        const chapter = {
            path_id: '第一卷/第 1 话',
            cover_file: '001.jpg',
            cover_source: 'hq',
            total_files: 12,
        };

        const result = await cache.getOrFetch(0, chapter, '测试系列');

        expect(getChapterCoverMeta).toHaveBeenCalledWith(chapter, '测试系列');
        expect(result).toEqual({
            totalPages: 12,
            files: [],
            coverUrl: 'http://example.com/测试系列/001.jpg',
            coverSource: 'hq',
        });
        expect(cache.get(0)).toEqual(result);
    });

    it('should return fallback metadata for missing chapter', async () => {
        const result = await cache.getOrFetch(99, null, 'TestSeries');

        expect(result).toEqual({ totalPages: 0, files: [], coverUrl: '', coverSource: '' });
        expect(getChapterCoverMeta).not.toHaveBeenCalled();
    });

    it('should fetch by pathId and cache it', async () => {
        const chapter = {
            path_id: '第一卷/第 2 话',
            cover_file: '002.jpg',
            cover_source: 'lq',
            total_files: 15,
        };

        const result = await cache.getOrFetchByPathId('第一卷/第 2 话', chapter, '测试系列');

        expect(getChapterCoverMeta).toHaveBeenCalledWith(chapter, '测试系列');
        expect(result).toEqual({
            totalPages: 15,
            files: [],
            coverUrl: 'http://example.com/测试系列/002.jpg',
            coverSource: 'lq',
        });
        expect(cache.pathIdCache.get('第一卷/第 2 话')).toEqual(result);
    });

    it('should return cached value by pathId without fetching', async () => {
        const cachedMeta = { totalPages: 20, files: [], coverUrl: 'cached', coverSource: 'hq' };
        cache.pathIdCache.set('test-path', cachedMeta);

        const chapter = { path_id: 'test-path', cover_file: 'new.jpg' };
        const result = await cache.getOrFetchByPathId('test-path', chapter, 'TestSeries');
        expect(result).toEqual(cachedMeta);
        expect(getChapterCoverMeta).not.toHaveBeenCalled();
    });

    it('should return fallback metadata for missing chapter by pathId', async () => {
        const result = await cache.getOrFetchByPathId('missing-path', null, 'TestSeries');

        expect(result).toEqual({ totalPages: 0, files: [], coverUrl: '', coverSource: '' });
        expect(getChapterCoverMeta).not.toHaveBeenCalled();
    });
});
