import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { persistence } from './persistence.js';
import { storage } from './storage.js';

describe('persistence', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-01T08:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('统一保存当前阅读位置', () => {
        const seriesSpy = vi.spyOn(storage, 'setCurrentSeries').mockImplementation(() => {});
        const chapterSpy = vi.spyOn(storage, 'setCurrentChapterPath').mockImplementation(() => {});

        persistence.saveCurrentPosition('测试系列', '第一卷/第 1 话');

        expect(seriesSpy).toHaveBeenCalledWith('测试系列');
        expect(chapterSpy).toHaveBeenCalledWith('第一卷/第 1 话');
    });

    it('忽略不完整的当前阅读位置', () => {
        const seriesSpy = vi.spyOn(storage, 'setCurrentSeries').mockImplementation(() => {});
        const chapterSpy = vi.spyOn(storage, 'setCurrentChapterPath').mockImplementation(() => {});

        persistence.saveCurrentPosition(null, '第一卷/第 1 话');
        persistence.saveCurrentPosition('测试系列', '');

        expect(seriesSpy).not.toHaveBeenCalled();
        expect(chapterSpy).not.toHaveBeenCalled();
    });

    it('统一保存阅读进度', () => {
        const setProgressSpy = vi.spyOn(storage, 'setProgress').mockImplementation(() => true);

        persistence.saveProgress('测试系列', 2, {
            page: 4,
            scrollPercent: 42,
            timestamp: Date.now(),
        });

        expect(setProgressSpy).toHaveBeenCalledWith('测试系列', 2, {
            page: 4,
            scrollPercent: 42,
            timestamp: Date.now(),
        });
    });
});
