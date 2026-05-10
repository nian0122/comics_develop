import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSeriesStore } from './series-store.js';

// Mock 服务模块
vi.mock('../services/api.js', () => ({
    api: {
        getSeries: vi.fn()
    }
}));

vi.mock('../services/storage.js', () => ({
    storage: {
        setCurrentSeries: vi.fn()
    }
}));

vi.mock('../services/persistence.js', () => ({
    persistence: {
        getCurrentSeries: vi.fn()
    }
}));

import { api } from '../services/api.js';
import { storage } from '../services/storage.js';
import { persistence } from '../services/persistence.js';

describe('series-store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('loadSeries', () => {
        it('加载系列列表并设置 state', async () => {
            const mockData = { series: ['系列A', '系列B', '系列C'] };
            api.getSeries.mockResolvedValue(mockData);

            const store = useSeriesStore();
            const result = await store.loadSeries();

            expect(result).toEqual(['系列A', '系列B', '系列C']);
            expect(store.list).toEqual(['系列A', '系列B', '系列C']);
            expect(store.loading).toBe(false);
            expect(store.error).toBeNull();
        });

        it('处理 API 错误', async () => {
            api.getSeries.mockRejectedValue(new Error('网络错误'));

            const store = useSeriesStore();

            await expect(store.loadSeries()).rejects.toThrow('网络错误');
            expect(store.error).toBe('网络错误');
            expect(store.loading).toBe(false);
        });

        it('处理空数据返回', async () => {
            api.getSeries.mockResolvedValue({});

            const store = useSeriesStore();
            const result = await store.loadSeries();

            expect(result).toEqual([]);
            expect(store.list).toEqual([]);
        });
    });

    describe('setCurrentSeries', () => {
        it('设置当前系列并写入 localStorage', () => {
            const store = useSeriesStore();

            store.setCurrentSeries('测试系列');

            expect(store.current).toBe('测试系列');
            expect(storage.setCurrentSeries).toHaveBeenCalledWith('测试系列');
        });

        it('不写入 localStorage 当 name 为 null', () => {
            const store = useSeriesStore();
            store.current = '旧系列';

            store.setCurrentSeries(null);

            expect(store.current).toBeNull();
            expect(storage.setCurrentSeries).not.toHaveBeenCalled();
        });
    });

    describe('restoreLastSeries', () => {
        it('从 persistence 恢复上次阅读的系列', () => {
            persistence.getCurrentSeries.mockReturnValue('上次系列');

            const store = useSeriesStore();
            const result = store.restoreLastSeries();

            expect(result).toBe('上次系列');
            expect(store.current).toBe('上次系列');
        });

        it('无上次阅读记录时返回 null', () => {
            persistence.getCurrentSeries.mockReturnValue(null);

            const store = useSeriesStore();
            const result = store.restoreLastSeries();

            expect(result).toBeNull();
            expect(store.current).toBeNull();
        });
    });

    describe('getters', () => {
        it('hasSeries 返回是否有系列数据', () => {
            const store = useSeriesStore();

            expect(store.hasSeries).toBe(false);

            store.list = ['系列A'];

            expect(store.hasSeries).toBe(true);
        });

        it('currentSeriesIndex 返回当前系列在列表中的索引', () => {
            const store = useSeriesStore();
            store.list = ['系列A', '系列B', '系列C'];
            store.current = '系列B';

            expect(store.currentSeriesIndex).toBe(1);
        });

        it('currentSeriesIndex 未匹配时返回 -1', () => {
            const store = useSeriesStore();
            store.list = ['系列A', '系列B'];
            store.current = '系列C';

            expect(store.currentSeriesIndex).toBe(-1);
        });
    });

    describe('clearCurrentSeries', () => {
        it('清除当前系列状态', () => {
            const store = useSeriesStore();
            store.current = '测试系列';

            store.clearCurrentSeries();

            expect(store.current).toBeNull();
        });
    });

    describe('$reset', () => {
        it('重置整个 store 状态', () => {
            const store = useSeriesStore();
            store.list = ['系列A', '系列B'];
            store.current = '系列A';
            store.loading = true;
            store.error = '错误';

            store.$reset();

            expect(store.list).toEqual([]);
            expect(store.current).toBeNull();
            expect(store.loading).toBe(false);
            expect(store.error).toBeNull();
        });
    });
});