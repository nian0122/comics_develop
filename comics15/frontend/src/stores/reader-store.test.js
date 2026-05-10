import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useReaderStore } from './reader-store.js';

vi.mock('../services/api.js', () => ({
    api: {
        getChapterFiles: vi.fn()
    }
}));

vi.mock('../config/constants.js', () => ({
    LAZY_LOAD_CONFIG: {
        ROOT_MARGIN: '1500px',
        INITIAL_BATCH: 10,
        BATCH_SIZE: 10
    },
    IMAGE_RETRY_CONFIG: {
        MAX_RETRIES: 3,
        INITIAL_DELAY: 1000
    }
}));

import { api } from '../services/api.js';

describe('reader-store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('loadFiles', () => {
        it('加载章节文件列表', async () => {
            const mockFiles = [
                { name: '001.jpg', type: 'image' },
                { name: '002.jpg', type: 'image' }
            ];
            api.getChapterFiles.mockResolvedValue({ files: mockFiles });

            const store = useReaderStore();
            const result = await store.loadFiles('测试系列', '第一卷/第1话');

            expect(result).toEqual(mockFiles);
            expect(store.files).toEqual(mockFiles);
            expect(store.loadedCount).toBe(0);
            expect(store.isLoading).toBe(false);
        });

        it('处理 API 错误', async () => {
            api.getChapterFiles.mockRejectedValue(new Error('网络错误'));

            const store = useReaderStore();

            await expect(store.loadFiles('系列', '章节')).rejects.toThrow('网络错误');
            expect(store.error).toBe('网络错误');
            expect(store.isLoading).toBe(false);
        });
    });

    describe('loadedCount 管理', () => {
        it('setLoadedCount 设置已加载数量', () => {
            const store = useReaderStore();
            store.files = [{}, {}, {}, {}];

            store.setLoadedCount(2);

            expect(store.loadedCount).toBe(2);
        });

        it('loadedCount 不能超过 files 长度', () => {
            const store = useReaderStore();
            store.files = [{}, {}];

            store.setLoadedCount(10);

            expect(store.loadedCount).toBe(2);
        });

        it('incrementLoadedCount 增加计数', () => {
            const store = useReaderStore();
            store.files = [{}, {}, {}];
            store.loadedCount = 1;

            store.incrementLoadedCount();

            expect(store.loadedCount).toBe(2);
        });

        it('incrementLoadedCount 不能超过 files 长度', () => {
            const store = useReaderStore();
            store.files = [{}, {}];
            store.loadedCount = 2;

            store.incrementLoadedCount();

            expect(store.loadedCount).toBe(2);
        });
    });

    describe('scale 管理', () => {
        it('setScale 设置缩放比例', () => {
            const store = useReaderStore();

            store.setScale(150);

            expect(store.scale).toBe(150);
        });

        it('scale 最小值为 50', () => {
            const store = useReaderStore();

            store.setScale(30);

            expect(store.scale).toBe(50);
        });

        it('scale 最大值为 200', () => {
            const store = useReaderStore();

            store.setScale(300);

            expect(store.scale).toBe(200);
        });
    });

    describe('懒加载状态管理', () => {
        it('setLazyObserver 设置观察器', () => {
            const observer = { disconnect: vi.fn() };
            const store = useReaderStore();

            store.setLazyObserver(observer);

            expect(store.lazyObserver).toStrictEqual(observer);
        });

        it('setLazyNextIndex 设置下一个观察索引', () => {
            const store = useReaderStore();

            store.setLazyNextIndex(5);

            expect(store.lazyNextIndex).toBe(5);
        });

        it('setLazyLoadedCount 和 incrementLazyLoadedCount', () => {
            const store = useReaderStore();

            store.setLazyLoadedCount(2);
            store.incrementLazyLoadedCount();

            expect(store.lazyLoadedCount).toBe(3);
        });

        it('setLazyIsObserving 设置观察状态', () => {
            const store = useReaderStore();

            store.setLazyIsObserving(true);

            expect(store.lazyIsObserving).toBe(true);
        });
    });

    describe('imageRetry 管理', () => {
        it('setImageRetry 和 getImageRetry', () => {
            const store = useReaderStore();
            const container = {};
            const state = { retries: 1, timeoutId: 123 };

            store.setImageRetry(container, state);

            expect(store.getImageRetry(container)).toEqual(state);
            expect(store.hasImageRetry(container)).toBe(true);
        });

        it('clearImageRetry 清除并取消 timeout', () => {
            const store = useReaderStore();
            const container = {};
            const timeoutId = 456;
            store.setImageRetry(container, { retries: 2, timeoutId });

            store.clearImageRetry(container);

            expect(store.hasImageRetry(container)).toBe(false);
            expect(vi.getTimerCount()).toBe(0);
        });

        it('clearImageRetry 无 timeoutId 时不报错', () => {
            const store = useReaderStore();
            const container = {};
            store.setImageRetry(container, { retries: 0 });

            store.clearImageRetry(container);

            expect(store.hasImageRetry(container)).toBe(false);
        });
    });

    describe('resetLazyLoad - cleanup 验证', () => {
        it('disconnect observer 并清除 timeout', () => {
            const store = useReaderStore();
            const observer = { disconnect: vi.fn() };
            store.setLazyObserver(observer);

            const container1 = {};
            const container2 = {};
            const timeoutId1 = 100;
            const timeoutId2 = 200;
            store.setImageRetry(container1, { retries: 1, timeoutId: timeoutId1 });
            store.setImageRetry(container2, { retries: 2, timeoutId: timeoutId2 });

            vi.spyOn(global, 'clearTimeout');

            store.resetLazyLoad();

            expect(observer.disconnect).toHaveBeenCalled();
            expect(store.lazyObserver).toBeNull();
            expect(clearTimeout).toHaveBeenCalledWith(timeoutId1);
            expect(clearTimeout).toHaveBeenCalledWith(timeoutId2);
            expect(store.imageRetry.size).toBe(0);
        });

        it('重置懒加载计数和状态', () => {
            const store = useReaderStore();
            store.lazyNextIndex = 5;
            store.lazyLoadedCount = 10;
            store.lazyIsObserving = true;

            store.resetLazyLoad();

            expect(store.lazyNextIndex).toBe(0);
            expect(store.lazyLoadedCount).toBe(0);
            expect(store.lazyIsObserving).toBe(false);
        });

        it('无 observer 时不调用 disconnect', () => {
            const store = useReaderStore();

            store.resetLazyLoad();

            expect(store.lazyObserver).toBeNull();
        });
    });

    describe('resetReader', () => {
        it('重置文件和加载状态', () => {
            const store = useReaderStore();
            store.files = [{}, {}];
            store.loadedCount = 2;
            store.isLoading = true;
            store.error = '错误';

            store.resetReader();

            expect(store.files).toEqual([]);
            expect(store.loadedCount).toBe(0);
            expect(store.isLoading).toBe(false);
            expect(store.error).toBeNull();
        });
    });

    describe('$reset', () => {
        it('完全重置 store 包括 lazyLoad cleanup', () => {
            const store = useReaderStore();
            const observer = { disconnect: vi.fn() };
            store.setLazyObserver(observer);
            store.files = [{}, {}];
            store.loadedCount = 2;
            store.scale = 150;
            store.setImageRetry({}, { retries: 1, timeoutId: 50 });

            store.$reset();

            expect(observer.disconnect).toHaveBeenCalled();
            expect(store.files).toEqual([]);
            expect(store.loadedCount).toBe(0);
            expect(store.scale).toBe(100);
            expect(store.imageRetry.size).toBe(0);
        });
    });

    describe('getters', () => {
        it('hasFiles 和 totalFiles', () => {
            const store = useReaderStore();

            expect(store.hasFiles).toBe(false);
            expect(store.totalFiles).toBe(0);

            store.files = [{}, {}, {}];

            expect(store.hasFiles).toBe(true);
            expect(store.totalFiles).toBe(3);
        });

        it('loadProgress 返回加载进度百分比', () => {
            const store = useReaderStore();
            store.files = [{}, {}, {}, {}];
            store.loadedCount = 2;

            expect(store.loadProgress).toBe(50);
        });

        it('loadProgress 无文件时返回 0', () => {
            const store = useReaderStore();

            expect(store.loadProgress).toBe(0);
        });

        it('hasMoreToLoad', () => {
            const store = useReaderStore();
            store.files = [{}, {}, {}];
            store.loadedCount = 1;

            expect(store.hasMoreToLoad).toBe(true);

            store.loadedCount = 3;

            expect(store.hasMoreToLoad).toBe(false);
        });
    });
});