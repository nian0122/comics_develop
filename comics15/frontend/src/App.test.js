import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import App from './App.vue';

// Mock router
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('vue-router', () => ({
    useRouter: () => ({
        replace: mockReplace,
        push: mockPush
    }),
    useRoute: vi.fn(),
    RouterView: {
        name: 'RouterView',
        template: '<div>RouterView</div>'
    }
}));

// Mock router helpers
vi.mock('./router/index.js', () => ({
    toReaderUrl: vi.fn((series, chapterPath) =>
        `/series/${encodeURIComponent(series)}/read/${encodeURIComponent(chapterPath)}`
    ),
    toSeriesUrl: vi.fn((series) =>
        `/series/${encodeURIComponent(series)}`
    ),
    toSeriesListUrl: vi.fn(() => '/')
}));

// Mock stores
vi.mock('./stores/series-store.js', () => ({
    useSeriesStore: vi.fn()
}));

vi.mock('./stores/chapter-store.js', () => ({
    useChapterStore: vi.fn()
}));

// Mock persistence
vi.mock('./services/persistence.js', () => ({
    persistence: {
        getCurrentSeries: vi.fn(),
        getCurrentChapterPath: vi.fn()
    }
}));

import { useRoute } from 'vue-router';
import { useSeriesStore } from './stores/series-store.js';
import { useChapterStore } from './stores/chapter-store.js';
import { persistence } from './services/persistence.js';
import { toReaderUrl, toSeriesUrl } from './router/index.js';

describe('App.vue 根路径恢复逻辑', () => {
    let mockSeriesStore;
    let mockChapterStore;
    let wrapper;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();

        // Default mock stores
        mockSeriesStore = {
            list: [],
            loading: false,
            error: null,
            current: null,
            loadSeries: vi.fn().mockResolvedValue(['系列A', '系列B', '系列C']),
            restoreLastSeries: vi.fn(),
            setCurrentSeries: vi.fn()
        };

        mockChapterStore = {
            flatList: [],
            loading: false,
            error: null,
            loadChapters: vi.fn().mockResolvedValue({ flatList: [], tree: [] }),
            setCurrentChapterByPathId: vi.fn()
        };

        useSeriesStore.mockReturnValue(mockSeriesStore);
        useChapterStore.mockReturnValue(mockChapterStore);

        // Default persistence - no saved data
        persistence.getCurrentSeries.mockReturnValue(null);
        persistence.getCurrentChapterPath.mockReturnValue(null);

        // Default route - root path
        useRoute.mockReturnValue({
            path: '/',
            name: 'seriesList'
        });
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.restoreAllMocks();
    });

    describe('根路径恢复逻辑', () => {
        it('saved series + saved chapter 有效时，replace 到 reader URL', async () => {
            // Setup: saved series exists in list, saved chapter path provided
            mockSeriesStore.list = ['系列A', '系列B', '系列C'];
            persistence.getCurrentSeries.mockReturnValue('系列B');
            persistence.getCurrentChapterPath.mockReturnValue('volume1/chapter1');

            wrapper = mount(App);

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 应调用 loadSeries
            expect(mockSeriesStore.loadSeries).toHaveBeenCalled();

            // 应调用 router.replace(toReaderUrl(...))
            expect(mockReplace).toHaveBeenCalled();
            expect(toReaderUrl).toHaveBeenCalledWith('系列B', 'volume1/chapter1');
        });

        it('只有 saved series 有效（无 saved chapter），replace 到 series URL', async () => {
            // Setup: saved series exists in list, but no saved chapter path
            mockSeriesStore.list = ['系列A', '系列B', '系列C'];
            persistence.getCurrentSeries.mockReturnValue('系列A');
            persistence.getCurrentChapterPath.mockReturnValue(null);

            wrapper = mount(App);

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 应调用 loadSeries
            expect(mockSeriesStore.loadSeries).toHaveBeenCalled();

            // 应调用 router.replace(toSeriesUrl(...))
            expect(mockReplace).toHaveBeenCalled();
            expect(toSeriesUrl).toHaveBeenCalledWith('系列A');
            expect(toReaderUrl).not.toHaveBeenCalled();
        });

        it('saved series 无效（不存在于列表），留在根路径', async () => {
            // Setup: saved series does NOT exist in loaded list
            mockSeriesStore.list = ['系列A', '系列B', '系列C'];
            persistence.getCurrentSeries.mockReturnValue('已删除的系列');
            persistence.getCurrentChapterPath.mockReturnValue('some/chapter');

            wrapper = mount(App);

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 应调用 loadSeries
            expect(mockSeriesStore.loadSeries).toHaveBeenCalled();

            // 不应调用 router.replace
            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('无 saved series 时，留在根路径', async () => {
            // Setup: no saved series at all
            mockSeriesStore.list = ['系列A', '系列B', '系列C'];
            persistence.getCurrentSeries.mockReturnValue(null);
            persistence.getCurrentChapterPath.mockReturnValue(null);

            wrapper = mount(App);

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 应调用 loadSeries
            expect(mockSeriesStore.loadSeries).toHaveBeenCalled();

            // 不应调用 router.replace
            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('saved chapter 为空字符串时视为无效，只恢复到 series URL', async () => {
            // Setup: saved series exists, saved chapter is empty string
            mockSeriesStore.list = ['系列A', '系列B', '系列C'];
            persistence.getCurrentSeries.mockReturnValue('系列B');
            persistence.getCurrentChapterPath.mockReturnValue('');

            wrapper = mount(App);

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 应调用 loadSeries
            expect(mockSeriesStore.loadSeries).toHaveBeenCalled();

            // 应只 replace 到 series URL（不跳转到 reader）
            expect(mockReplace).toHaveBeenCalled();
            expect(toSeriesUrl).toHaveBeenCalledWith('系列B');
            expect(toReaderUrl).not.toHaveBeenCalled();
        });
    });

    describe('非根路径不触发恢复', () => {
        it('非根路径（如 /series/xxx）不触发 loadSeries 和 replace', async () => {
            // Setup: route is NOT root path
            useRoute.mockReturnValue({
                path: '/series/%E7%B3%BB%E5%88%97A',
                name: 'directory',
                params: { series: '系列A' }
            });

            wrapper = mount(App);

            await flushPromises();
            await nextTick();

            // 不应调用 loadSeries（非根路径不触发恢复）
            expect(mockSeriesStore.loadSeries).not.toHaveBeenCalled();

            // 不应调用 router.replace
            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('reader 路径不触发恢复', async () => {
            // Setup: route is reader path
            useRoute.mockReturnValue({
                path: '/series/%E7%B3%BB%E5%88%97A/read/volume1/chapter1',
                name: 'reader',
                params: { series: '系列A', path: 'volume1/chapter1' }
            });

            wrapper = mount(App);

            await flushPromises();
            await nextTick();

            // 不应调用 loadSeries
            expect(mockSeriesStore.loadSeries).not.toHaveBeenCalled();
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    describe('loadSeries 失败时不触发恢复', () => {
        it('loadSeries 失败（网络错误）时留在根路径，不 replace', async () => {
            // Setup: loadSeries throws error
            mockSeriesStore.loadSeries.mockRejectedValue(new Error('网络错误'));
            persistence.getCurrentSeries.mockReturnValue('系列A');
            persistence.getCurrentChapterPath.mockReturnValue('chapter1');

            wrapper = mount(App);

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 应调用 loadSeries 但失败
            expect(mockSeriesStore.loadSeries).toHaveBeenCalled();

            // 不应调用 router.replace（失败时不恢复）
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });
});
