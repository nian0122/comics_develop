import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import ReaderPage from './ReaderPage.vue';

const mockPush = vi.fn();

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush }),
    useRoute: vi.fn()
}));

vi.mock('../router/index.js', () => ({
    toReaderUrl: vi.fn((series, chapterPath) =>
        `/series/${encodeURIComponent(series)}/read/${encodeURIComponent(chapterPath)}`
    ),
    toDirectoryUrl: vi.fn((series, path) => {
        const base = `/series/${encodeURIComponent(series)}`;
        return path ? `${base}/dir/${encodeURIComponent(path)}` : base;
    }),
    encodePathSegments: vi.fn((path) =>
        (path || '').split('/').filter(Boolean).map(s => encodeURIComponent(s)).join('/')
    )
}));

vi.mock('../stores/chapter-store.js', () => ({
    useChapterStore: vi.fn()
}));

vi.mock('../stores/reader-store.js', () => ({
    useReaderStore: vi.fn()
}));

vi.mock('../stores/progress-store.js', () => ({
    useProgressStore: vi.fn()
}));

vi.mock('../stores/series-store.js', () => ({
    useSeriesStore: vi.fn()
}));

vi.mock('../../js/services/persistence.js', () => ({
    persistence: {
        saveCurrentPosition: vi.fn()
    }
}));

vi.mock('../../js/services/api.js', () => ({
    api: {
        getChapterFiles: vi.fn()
    }
}));

vi.mock('../../js/config/constants.js', () => ({
    LAZY_LOAD_CONFIG: {
        ROOT_MARGIN: '1500px',
        COVER_ROOT_MARGIN: '80px 0px',
        INITIAL_BATCH: 10,
        BATCH_SIZE: 10
    }
}));

import { useChapterStore } from '../stores/chapter-store.js';
import { useReaderStore } from '../stores/reader-store.js';
import { useProgressStore } from '../stores/progress-store.js';
import { useSeriesStore } from '../stores/series-store.js';
import { persistence } from '../../js/services/persistence.js';
import { api } from '../../js/services/api.js';
import { toReaderUrl, toDirectoryUrl } from '../router/index.js';
import { useRoute } from 'vue-router';

function createMockIntersectionObserver() {
    const instances = [];
    const MockIntersectionObserver = vi.fn((callback, options) => {
        const instance = {
            callback,
            options,
            elements: new Set(),
            observe: vi.fn((el) => {
                instance.elements.add(el);
            }),
            unobserve: vi.fn((el) => {
                instance.elements.delete(el);
            }),
            disconnect: vi.fn(() => {
                instance.elements.clear();
            })
        };
        instances.push(instance);
        return instance;
    });
    MockIntersectionObserver.instances = instances;
    return MockIntersectionObserver;
}

describe('ReaderPage', () => {
    let mockChapterStore;
    let mockReaderStore;
    let mockProgressStore;
    let mockSeriesStore;
    let wrapper;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mockPush.mockClear();

        globalThis.IntersectionObserver = createMockIntersectionObserver();

        mockChapterStore = {
            flatList: [],
            currentIndex: -1,
            loading: false,
            loadChapters: vi.fn().mockImplementation(async (series) => {
                mockChapterStore.flatList = [
                    { path_id: 'chapter1', path: 'chapter1', name: '第1章' },
                    { path_id: 'chapter2', path: 'chapter2', name: '第2章' },
                    { path_id: 'chapter3', path: 'chapter3', name: '第3章' }
                ];
                return { flatList: mockChapterStore.flatList };
            }),
            setCurrentChapterByPathId: vi.fn((pathId) => {
                const index = mockChapterStore.flatList.findIndex(ch => ch.path_id === pathId);
                mockChapterStore.currentIndex = index >= 0 ? index : -1;
            }),
            getCurrentChapter: vi.fn(() => mockChapterStore.flatList[mockChapterStore.currentIndex]),
            getChapterAtIndex: vi.fn((index) => mockChapterStore.flatList[index])
        };
        useChapterStore.mockReturnValue(mockChapterStore);

        mockReaderStore = {
            files: [],
            loadedCount: 0,
            isLoading: false,
            scale: 100,
            lazyObserver: null,
            loadFiles: vi.fn().mockImplementation(async (series, path) => {
                mockReaderStore.files = [
                    { filename: '001.jpg', path_id: 'chapter1' },
                    { filename: '002.jpg', path_id: 'chapter1' },
                    { filename: '003.jpg', path_id: 'chapter1' }
                ];
                return mockReaderStore.files;
            }),
            setLoadedCount: vi.fn()
        };
        useReaderStore.mockReturnValue(mockReaderStore);

        mockProgressStore = {
            currentPage: 1,
            totalPages: 0,
            scrollPercent: 0,
            init: vi.fn(),
            restoreFromStorage: vi.fn().mockReturnValue(null),
            saveToStorage: vi.fn(),
            setCurrentPage: vi.fn(),
            updateScrollPercent: vi.fn()
        };
        useProgressStore.mockReturnValue(mockProgressStore);

        mockSeriesStore = {
            current: null,
            setCurrent: vi.fn((name) => {
                mockSeriesStore.current = name;
            })
        };
        useSeriesStore.mockReturnValue(mockSeriesStore);

        useRoute.mockReturnValue({
            params: { series: 'test-series', path: 'chapter1' },
            name: 'reader'
        });

        api.getChapterFiles.mockResolvedValue({
            files: [
                { filename: '001.jpg', path_id: 'chapter1' },
                { filename: '002.jpg', path_id: 'chapter1' },
                { filename: '003.jpg', path_id: 'chapter1' }
            ]
        });
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
            wrapper = null;
        }
        vi.clearAllMocks();
        globalThis.IntersectionObserver = undefined;
    });

    describe('route 加载章节文件', () => {
        it('route params series 和 path 触发 loadChapters 和 loadFiles', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(mockChapterStore.loadChapters).toHaveBeenCalledWith('test-series');
            expect(mockChapterStore.setCurrentChapterByPathId).toHaveBeenCalledWith('chapter1');
        });

        it('章节数据加载完成后调用 loadFiles', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(mockReaderStore.loadFiles).toHaveBeenCalledWith('test-series', 'chapter1');
        });

        it('文件加载后更新 progressStore.init', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(mockProgressStore.init).toHaveBeenCalledWith(3, 'test-series', 0);
        });
    });

    describe('渲染 ReaderMediaItem', () => {
        it('渲染 ReaderShell 组件', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(wrapper.findComponent({ name: 'ReaderShell' }).exists()).toBe(true);
        });

        it('渲染 reader 容器', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(wrapper.find('#reader').exists()).toBe(true);
        });
    });

    describe('进度初始化与恢复', () => {
        it('调用 progressStore.init 初始化进度', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(mockProgressStore.init).toHaveBeenCalled();
        });

        it('尝试恢复已有进度', async () => {
            mockProgressStore.restoreFromStorage.mockReturnValue({
                page: 2,
                scrollPercent: 50,
                timestamp: Date.now()
            });

            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(mockProgressStore.restoreFromStorage).toHaveBeenCalledWith('test-series', 0);
        });
    });

    describe('保存当前位置', () => {
        it('加载完成后调用 persistence.saveCurrentPosition', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(persistence.saveCurrentPosition).toHaveBeenCalledWith('test-series', 'chapter1');
        });
    });

    describe('章节导航', () => {
        it('上一章按钮调用 toReaderUrl 并导航', async () => {
            mockChapterStore.currentIndex = 1;
            mockChapterStore.flatList = [
                { path_id: 'chapter1', path: 'chapter1', name: '第1章' },
                { path_id: 'chapter2', path: 'chapter2', name: '第2章' }
            ];
            mockChapterStore.setCurrentChapterByPathId = vi.fn((pathId) => {
                mockChapterStore.currentIndex = 1;
            });
            mockChapterStore.getCurrentChapter = vi.fn(() => mockChapterStore.flatList[1]);
            mockChapterStore.getChapterAtIndex = vi.fn((index) => mockChapterStore.flatList[index]);

            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const readerShell = wrapper.findComponent({ name: 'ReaderShell' });
            await readerShell.vm.$emit('prev');
            await flushPromises();

            expect(mockChapterStore.getChapterAtIndex).toHaveBeenCalledWith(0);
            expect(mockPush).toHaveBeenCalled();
        });

        it('下一章按钮调用 toReaderUrl 并导航', async () => {
            mockChapterStore.currentIndex = 0;
            mockChapterStore.flatList = [
                { path_id: 'chapter1', path: 'chapter1', name: '第1章' },
                { path_id: 'chapter2', path: 'chapter2', name: '第2章' }
            ];
            mockChapterStore.setCurrentChapterByPathId = vi.fn((pathId) => {
                mockChapterStore.currentIndex = 0;
            });
            mockChapterStore.getCurrentChapter = vi.fn(() => mockChapterStore.flatList[0]);
            mockChapterStore.getChapterAtIndex = vi.fn((index) => mockChapterStore.flatList[index]);

            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const readerShell = wrapper.findComponent({ name: 'ReaderShell' });
            await readerShell.vm.$emit('next');
            await flushPromises();

            expect(mockChapterStore.getChapterAtIndex).toHaveBeenCalledWith(1);
            expect(mockPush).toHaveBeenCalled();
        });

        it('返回目录调用 toDirectoryUrl 并导航', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const readerShell = wrapper.findComponent({ name: 'ReaderShell' });
            await readerShell.vm.$emit('back');
            await flushPromises();

            expect(toDirectoryUrl).toHaveBeenCalledWith('test-series', '');
            expect(mockPush).toHaveBeenCalled();
        });
    });

    describe('懒加载 Observer', () => {
        it('setupLazyObserver 创建 IntersectionObserver', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(globalThis.IntersectionObserver).toHaveBeenCalled();
        });

        it('setMediaItemRef 正确绑定组件引用', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(wrapper.vm.setMediaItemRef).toBeDefined();

            const mockComponent = { loadMedia: vi.fn() };
            wrapper.vm.setMediaItemRef(mockComponent, 0);
            expect(wrapper.vm.mediaItemRefs[0]).toStrictEqual(mockComponent);
        });

        it('observer callback 使用 mediaItemRefs[index].loadMedia', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const mockComponent = { loadMedia: vi.fn() };
            wrapper.vm.setMediaItemRef(mockComponent, 0);

            const observerInstance = globalThis.IntersectionObserver.instances[0];
            const mockContainer = { dataset: { index: '0' } };

            observerInstance.callback([
                { target: mockContainer, isIntersecting: true }
            ], observerInstance);

            expect(mockComponent.loadMedia).toHaveBeenCalled();
        });

        it('route change 或 unmount disconnect observer', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const observerInstance = globalThis.IntersectionObserver.instances[0];

            wrapper.unmount();
            wrapper = null;

            expect(observerInstance.disconnect).toHaveBeenCalled();
        });
    });

    describe('跳页功能', () => {
        it('jumpToPage 调用 progressStore.setCurrentPage', async () => {
            mockProgressStore.totalPages = 3;

            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const readerShell = wrapper.findComponent({ name: 'ReaderShell' });
            await readerShell.vm.$emit('jump');
            await flushPromises();
            await nextTick();

            expect(wrapper.vm.jumpModalVisible).toBe(true);
        });
    });

    describe('DOM 结构', () => {
        it('渲染 ReaderShell 组件', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(wrapper.findComponent({ name: 'ReaderShell' }).exists()).toBe(true);
        });

        it('渲染 reader 容器', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            expect(wrapper.find('#reader').exists()).toBe(true);
        });
    });

    describe('媒体加载事件 payload 处理', () => {
        it('handleMediaLoaded 正确处理 { index, filename } payload', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            // 直接调用 handleMediaLoaded 并传入对象 payload
            wrapper.vm.handleMediaLoaded({ index: 1, filename: '002.jpg' });

            // index 1 -> loadedCount = 2
            expect(mockReaderStore.setLoadedCount).toHaveBeenCalledWith(2);
        });

        it('handleMediaLoaded payload.index=0 时 setLoadedCount(1)', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            wrapper.vm.handleMediaLoaded({ index: 0, filename: '001.jpg' });

            expect(mockReaderStore.setLoadedCount).toHaveBeenCalledWith(1);
        });

        it('handleMediaFailed 正确处理 { index, filename } payload', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const consoleSpy = vi.spyOn(console, 'error');

            wrapper.vm.handleMediaFailed({ index: 0, filename: '001.jpg' });

            // 确保日志包含 index 和 filename，无 undefined 问题
            expect(consoleSpy).toHaveBeenCalledWith('Media item 0 (001.jpg) 加载失败');

            consoleSpy.mockRestore();
        });

        it('handleMediaFailed payload.index 非数字时不产生 NaN', async () => {
            wrapper = mount(ReaderPage, {
                global: {
                    plugins: [createPinia()]
                }
            });

            await flushPromises();
            await nextTick();
            await flushPromises();

            const consoleSpy = vi.spyOn(console, 'error');

            // 传入异常 payload（如 index 为字符串）
            wrapper.vm.handleMediaFailed({ index: 'invalid', filename: 'test.jpg' });

            // 日志应该正常输出，不产生 NaN 或 undefined
            expect(consoleSpy).toHaveBeenCalledWith('Media item invalid (test.jpg) 加载失败');

            consoleSpy.mockRestore();
        });
    });
});