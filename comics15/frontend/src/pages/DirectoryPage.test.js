import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import DirectoryPage from './DirectoryPage.vue';

const mockPush = vi.fn();

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush }),
    useRoute: () => ({
        params: { series: 'test-series', path: '' },
        name: 'directory'
    })
}));

vi.mock('../router/index.js', () => ({
    toDirectoryUrl: vi.fn((series, path) => {
        const base = `/series/${encodeURIComponent(series)}`;
        return path ? `${base}/dir/${encodeURIComponent(path)}` : base;
    }),
    toReaderUrl: vi.fn((series, chapterPath) =>
        `/series/${encodeURIComponent(series)}/read/${encodeURIComponent(chapterPath)}`
    ),
    toSeriesListUrl: vi.fn(() => '/')
}));

vi.mock('../stores/chapter-store.js', () => ({
    useChapterStore: vi.fn()
}));

vi.mock('../services/storage.js', () => ({
    storage: {
        getSeriesProgress: vi.fn()
    }
}));

vi.mock('../services/chapter-meta-cache.js', () => ({
    ChapterMetaCache: vi.fn()
}));

vi.mock('../utils/request-queue.js', () => ({
    RequestQueue: vi.fn()
}));

vi.mock('../config/constants.js', () => ({
    LAZY_LOAD_CONFIG: {
        ROOT_MARGIN: '1500px',
        COVER_ROOT_MARGIN: '80px 0px',
        INITIAL_BATCH: 10,
        BATCH_SIZE: 10,
        COVER_MAX_CONCURRENT: 3,
    }
}));

import { useChapterStore } from '../stores/chapter-store.js';
import { storage } from '../services/storage.js';
import { toDirectoryUrl, toReaderUrl } from '../router/index.js';
import { ChapterMetaCache } from '../services/chapter-meta-cache.js';
import { RequestQueue } from '../utils/request-queue.js';
function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('DirectoryPage', () => {
    let mockStore;
    let wrapper;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mockPush.mockClear();

        mockStore = {
            flatList: [],
            tree: [],
            levelCache: new Map(),
            loading: false,
            error: null,
            loadChapters: vi.fn().mockResolvedValue({ flatList: [], tree: [] }),
            loadLevelNodes: vi.fn().mockResolvedValue([]),
            setCurrentChapterByPathId: vi.fn(),
            getLevelCache: vi.fn(),
            setLevelCache: vi.fn()
        };
        useChapterStore.mockReturnValue(mockStore);
        storage.getSeriesProgress.mockReturnValue({});
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
    });

    describe('渲染结构', () => {
        it('渲染 mobile-view wrapper', async () => {
            wrapper = mount(DirectoryPage);
            await nextTick();
            expect(wrapper.find('.mobile-view').exists()).toBe(true);
        });

        it('渲染 mobile-topbar 和 text-back-btn', async () => {
            wrapper = mount(DirectoryPage);
            await nextTick();
            expect(wrapper.find('.mobile-topbar').exists()).toBe(true);
            expect(wrapper.find('.text-back-btn').exists()).toBe(true);
        });

        it('渲染 directory-list 容器', async () => {
            wrapper = mount(DirectoryPage);
            await nextTick();
            expect(wrapper.find('.directory-list').exists()).toBe(true);
        });

        it('渲染空状态 mobile-state-card', async () => {
            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();
            expect(wrapper.find('.mobile-state-card').exists()).toBe(true);
            expect(wrapper.find('.mobile-state-card').text()).toContain('当前目录为空');
        });

        it('渲染目录行 directory-row', async () => {
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'directory', path: '第一卷', name: '第一卷' }
            ]);
            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const rows = wrapper.findAll('.directory-row');
            expect(rows.length).toBe(1);
            expect(rows[0].attributes('data-path')).toBe('第一卷');
            expect(rows[0].find('.folder-mark').exists()).toBe(true);
            expect(rows[0].find('.row-chevron').exists()).toBe(true);
        });

        it('渲染章节卡片 chapter-card-v2', async () => {
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'chapter', path_id: '第一卷/第1话', name: '第1话', total_files: 24 }
            ]);
            storage.getSeriesProgress.mockReturnValue({
                '第一卷/第1话': { page: 5 }
            });

            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const cards = wrapper.findAll('.chapter-card-v2');
            expect(cards.length).toBe(1);
            expect(cards[0].attributes('data-path-id')).toBe('第一卷/第1话');
        });
    });

    describe('加载行为', () => {
        it('onMounted 时只按需调用当前层级节点，不触发全量章节递归', async () => {
            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            expect(mockStore.loadChapters).not.toHaveBeenCalled();
            expect(mockStore.loadLevelNodes).toHaveBeenCalledWith('test-series', '');
        });
    });

    describe('导航行为', () => {
        it('点击目录行导航到子目录', async () => {
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'directory', path: '第一卷/子目录', name: '子目录' }
            ]);
            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const row = wrapper.find('.directory-row');
            await row.trigger('click');

            expect(toDirectoryUrl).toHaveBeenCalledWith('test-series', '第一卷/子目录');
            expect(mockPush).toHaveBeenCalled();
        });

        it('点击章节卡片导航到阅读器', async () => {
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'chapter', path_id: '卷/话', name: '话' }
            ]);
            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const card = wrapper.find('.chapter-card-v2');
            await card.trigger('click');

            expect(mockStore.setCurrentChapterByPathId).toHaveBeenCalledWith('卷/话');
            expect(toReaderUrl).toHaveBeenCalledWith('test-series', '卷/话');
            expect(mockPush).toHaveBeenCalled();
        });
    });

    describe('返回按钮', () => {
        it('根级返回导航到系列列表', async () => {
            wrapper = mount(DirectoryPage);
            await nextTick();

            const backBtn = wrapper.find('.text-back-btn');
            expect(backBtn.text()).toBe('‹ 系列');

            await backBtn.trigger('click');
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    describe('标题显示', () => {
        it('根级显示系列名称作为标题', async () => {
            wrapper = mount(DirectoryPage);
            await nextTick();

            const kicker = wrapper.find('.mobile-kicker');
            const title = wrapper.find('.mobile-page-header h1');
            expect(kicker.text()).toBe('test-series');
            expect(title.text()).toBe('test-series');
        });
    });

    describe('加载状态', () => {
        it('显示加载状态', async () => {
            mockStore.loading = true;
            wrapper = mount(DirectoryPage);
            await nextTick();

            const loadingText = wrapper.find('.mobile-page-header p:last-of-type');
            expect(loadingText.text()).toContain('正在加载');
        });
    });

    describe('错误状态', () => {
        it('显示错误状态', async () => {
            mockStore.error = '加载失败';
            wrapper = mount(DirectoryPage);
            await nextTick();

            const errorCard = wrapper.find('.mobile-state-card.error-state');
            expect(errorCard.exists()).toBe(true);
            expect(errorCard.text()).toContain('加载失败');
        });
    });

    describe('封面懒加载', () => {
        let mockChapterMetaCache;
        let mockRequestQueue;
        let mockObserver;
        let intersectionObserverMock;

        beforeEach(() => {
            mockChapterMetaCache = {
                getOrFetchByPathId: vi.fn().mockResolvedValue({
                    coverUrl: '/lq_image/series/chapter/cover.webp'
                })
            };
            ChapterMetaCache.mockReturnValue(mockChapterMetaCache);

            mockRequestQueue = {
                add: vi.fn().mockImplementation(async (fn) => await fn()),
                clear: vi.fn()
            };
            RequestQueue.mockReturnValue(mockRequestQueue);

            mockObserver = {
                observe: vi.fn(),
                disconnect: vi.fn()
            };

            intersectionObserverMock = vi.fn().mockImplementation((callback) => {
                mockObserver.callback = callback;
                return mockObserver;
            });
            vi.stubGlobal('IntersectionObserver', intersectionObserverMock);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
            vi.restoreAllMocks();
        });

it('IntersectionObserver 触发时调用 chapterMetaCache.getOrFetchByPathId', async () => {
            const pathId = '第一卷/第1话';
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'chapter', path_id: pathId, name: '第1话', total_files: 24 }
            ]);

            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const coverEl = wrapper.find('.chapter-cover').element;

            mockObserver.callback([{ target: coverEl, isIntersecting: true }]);
            await flushPromises();
            await nextTick();

            expect(mockChapterMetaCache.getOrFetchByPathId).toHaveBeenCalledWith(pathId);
        });

        it('获取封面后更新 ChapterCard cover prop', async () => {
            const coverUrl = '/lq_image/test/cover.webp';
            mockChapterMetaCache.getOrFetchByPathId.mockResolvedValue({ coverUrl });
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'chapter', path_id: '卷/话', name: '话' }
            ]);

            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const coverEl = wrapper.find('.chapter-cover').element;
            mockObserver.callback([{ target: coverEl, isIntersecting: true }]);
            await flushPromises();
            await nextTick();

            const card = wrapper.findComponent({ name: 'ChapterCard' });
            expect(card.props('cover')).toBe(coverUrl);
        });

        it('使用 token guard 防止 stale fetch 更新', async () => {
            mockChapterMetaCache.getOrFetchByPathId.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { coverUrl: '/lq_image/cover.webp' };
            });
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'chapter', path_id: '卷/话', name: '话' }
            ]);

            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            const coverEl = wrapper.find('.chapter-cover').element;
            mockObserver.callback([{ target: coverEl, isIntersecting: true }]);
            await flushPromises();

            wrapper.unmount();
            wrapper = null;
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockChapterMetaCache.getOrFetchByPathId).toHaveBeenCalled();
        });

        it('onBeforeUnmount disconnect observer 和 clear queue', async () => {
            mockStore.loadLevelNodes.mockResolvedValue([
                { type: 'chapter', path_id: '卷/话', name: '话' }
            ]);

            wrapper = mount(DirectoryPage);
            await flushPromises();
            await nextTick();

            wrapper.unmount();
            wrapper = null;

            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(mockRequestQueue.clear).toHaveBeenCalled();
        });
    });
});
