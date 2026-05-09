import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProgressStore } from './progress-store.js';

vi.mock('../../js/services/persistence.js', () => ({
    persistence: {
        saveProgress: vi.fn(),
        getProgress: vi.fn(),
        clearProgress: vi.fn()
    }
}));

vi.mock('../../js/state/progress-state.js', () => ({
    progressState: {
        init: vi.fn(),
        setCurrentPage: vi.fn(),
        updateScrollPercent: vi.fn(),
        restoreFromStorage: vi.fn(),
        saveToStorage: vi.fn()
    }
}));

import { persistence } from '../../js/services/persistence.js';
import { progressState } from '../../js/state/progress-state.js';

describe('progress-store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-01T08:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('init', () => {
        it('初始化进度状态', () => {
            const store = useProgressStore();

            store.init(10);

            expect(store.totalPages).toBe(10);
            expect(store.currentPage).toBe(1);
            expect(store.loadedPages).toBe(0);
            expect(store.scrollPercent).toBe(0);
        });

        it('从存储恢复进度', () => {
            progressState.restoreFromStorage.mockReturnValue({
                page: 5,
                scrollPercent: 30,
                timestamp: 1000
            });

            const store = useProgressStore();
            store.init(10, '测试系列', 2);

            expect(store.currentPage).toBe(5);
            expect(store.scrollPercent).toBe(30);
            expect(store.lastReadTime).toBe(1000);
        });

        it('无存储数据时使用默认值', () => {
            progressState.restoreFromStorage.mockReturnValue(null);

            const store = useProgressStore();
            store.init(10, '测试系列', 2);

            expect(store.currentPage).toBe(1);
            expect(store.scrollPercent).toBe(0);
        });
    });

    describe('setCurrentPage', () => {
        it('设置当前页码', () => {
            const store = useProgressStore();
            store.totalPages = 10;

            store.setCurrentPage(5);

            expect(store.currentPage).toBe(5);
        });

        it('页码不能小于 1', () => {
            const store = useProgressStore();
            store.totalPages = 10;

            store.setCurrentPage(0);

            expect(store.currentPage).toBe(1);
        });

        it('页码不能超过 totalPages', () => {
            const store = useProgressStore();
            store.totalPages = 10;

            store.setCurrentPage(15);

            expect(store.currentPage).toBe(10);
        });
    });

    describe('setLoadedPages', () => {
        it('设置已加载页数', () => {
            const store = useProgressStore();
            store.totalPages = 10;

            store.setLoadedPages(5);

            expect(store.loadedPages).toBe(5);
        });

        it('loadedPages 不能超过 totalPages', () => {
            const store = useProgressStore();
            store.totalPages = 5;

            store.setLoadedPages(10);

            expect(store.loadedPages).toBe(5);
        });
    });

    describe('updateScrollPercent', () => {
        it('更新滚动百分比', () => {
            const store = useProgressStore();

            store.updateScrollPercent(42);

            expect(store.scrollPercent).toBe(42);
        });

        it('滚动百分比限制在 0-100', () => {
            const store = useProgressStore();

            store.updateScrollPercent(-10);
            expect(store.scrollPercent).toBe(0);

            store.updateScrollPercent(150);
            expect(store.scrollPercent).toBe(100);
        });
    });

    describe('saveToStorage', () => {
        it('保存进度到存储', () => {
            const store = useProgressStore();
            store.currentPage = 5;
            store.scrollPercent = 30;
            store.lastReadTime = 1000;

            store.saveToStorage('测试系列', 2);

            expect(persistence.saveProgress).toHaveBeenCalledWith('测试系列', 2, {
                page: 5,
                scrollPercent: 30,
                timestamp: 1000
            });
        });

        it('无系列名时不保存', () => {
            const store = useProgressStore();

            store.saveToStorage(null, 2);

            expect(persistence.saveProgress).not.toHaveBeenCalled();
        });

        it('无效章节索引时不保存', () => {
            const store = useProgressStore();

            store.saveToStorage('系列', -1);

            expect(persistence.saveProgress).not.toHaveBeenCalled();
        });
    });

    describe('restoreFromStorage', () => {
        it('从存储恢复进度', () => {
            persistence.getProgress.mockReturnValue({
                page: 3,
                scrollPercent: 20,
                timestamp: 500
            });

            const store = useProgressStore();
            const result = store.restoreFromStorage('系列', 1);

            expect(result).toEqual({ page: 3, scrollPercent: 20, timestamp: 500 });
            expect(store.currentPage).toBe(3);
            expect(store.scrollPercent).toBe(20);
        });

        it('无存储数据返回 null', () => {
            persistence.getProgress.mockReturnValue(null);

            const store = useProgressStore();
            const result = store.restoreFromStorage('系列', 1);

            expect(result).toBeNull();
        });
    });

    describe('clearProgress', () => {
        it('清除进度存储', () => {
            const store = useProgressStore();
            store.currentPage = 5;
            store.scrollPercent = 30;

            store.clearProgress('系列', 2);

            expect(persistence.clearProgress).toHaveBeenCalledWith('系列', 2);
            expect(store.currentPage).toBe(1);
            expect(store.scrollPercent).toBe(0);
        });
    });

    describe('syncToLegacyState', () => {
        it('同步到 legacy progressState', () => {
            const store = useProgressStore();
            store.totalPages = 10;
            store.currentPage = 5;
            store.scrollPercent = 30;

            store.syncToLegacyState('系列', 2);

            expect(progressState.init).toHaveBeenCalledWith(10);
            expect(progressState.setCurrentPage).toHaveBeenCalledWith(5);
            expect(progressState.updateScrollPercent).toHaveBeenCalledWith(30);
        });
    });

    describe('getters', () => {
        it('displayText 返回显示文本', () => {
            const store = useProgressStore();
            store.currentPage = 5;
            store.totalPages = 10;

            expect(store.displayText).toBe('5 / 10 (50%)');
        });

        it('displayText 无页数时返回正确格式', () => {
            const store = useProgressStore();
            store.currentPage = 1;
            store.totalPages = 0;

            expect(store.displayText).toBe('1 / 0 (0%)');
        });

        it('briefText 返回简短文本', () => {
            const store = useProgressStore();
            store.currentPage = 5;
            store.totalPages = 10;

            expect(store.briefText).toBe('5 / 10');
        });

        it('progressPercent 返回进度百分比', () => {
            const store = useProgressStore();
            store.currentPage = 3;
            store.totalPages = 10;

            expect(store.progressPercent).toBe(30);
        });

        it('progressPercent 无页数时返回 0', () => {
            const store = useProgressStore();
            store.totalPages = 0;

            expect(store.progressPercent).toBe(0);
        });
    });

    describe('$reset', () => {
        it('重置进度状态', () => {
            const store = useProgressStore();
            store.currentPage = 5;
            store.totalPages = 10;
            store.loadedPages = 5;
            store.scrollPercent = 30;
            store.lastReadTime = 1000;

            store.$reset();

            expect(store.currentPage).toBe(1);
            expect(store.totalPages).toBe(0);
            expect(store.loadedPages).toBe(0);
            expect(store.scrollPercent).toBe(0);
            expect(store.lastReadTime).toBe(0);
        });
    });
});