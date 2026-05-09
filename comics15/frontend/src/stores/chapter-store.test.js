import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChapterStore } from './chapter-store.js';

vi.mock('../../js/services/api.js', () => ({
    api: {
        getChapters: vi.fn()
    }
}));

vi.mock('../../js/services/catalog-api.js', () => ({
    catalogApi: {
        getLevelNodes: vi.fn()
    }
}));

vi.mock('../../js/utils/chapter-tree.js', () => ({
    buildChapterTree: vi.fn()
}));

vi.mock('../../js/app/chapter-meta-cache.js', () => ({
    ChapterMetaCache: vi.fn().mockImplementation(() => ({
        cache: new Map(),
        pathIdCache: new Map(),
        clear: vi.fn(),
        getOrFetch: vi.fn().mockResolvedValue({ totalPages: 0, files: [], coverUrl: '', coverSource: '' }),
        getOrFetchByPathId: vi.fn().mockResolvedValue({ totalPages: 0, files: [], coverUrl: '', coverSource: '' })
    }))
}));

import { api } from '../../js/services/api.js';
import { catalogApi } from '../../js/services/catalog-api.js';
import { buildChapterTree } from '../../js/utils/chapter-tree.js';

describe('chapter-store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('loadChapters', () => {
        it('加载章节列表并构建树', async () => {
            const mockChapters = [
                { path_id: '第一卷/第1话', name: '第1话' },
                { path_id: '第一卷/第2话', name: '第2话' }
            ];
            const mockTree = { name: 'root', children: [] };
            api.getChapters.mockResolvedValue({ chapters: mockChapters });
            buildChapterTree.mockReturnValue(mockTree);

            const store = useChapterStore();
            const result = await store.loadChapters('测试系列');

            expect(result.flatList).toEqual(mockChapters);
            expect(result.tree).toEqual(mockTree);
            expect(store.flatList).toEqual(mockChapters);
            expect(store.tree).toEqual(mockTree);
            expect(store.loading).toBe(false);
        });

        it('加载时清除元数据缓存', async () => {
            api.getChapters.mockResolvedValue({ chapters: [] });
            buildChapterTree.mockReturnValue({});

            const store = useChapterStore();
            await store.loadChapters('测试系列');

            expect(store.metaCache.clear).toHaveBeenCalled();
        });

        it('处理 API 错误', async () => {
            api.getChapters.mockRejectedValue(new Error('网络错误'));

            const store = useChapterStore();

            await expect(store.loadChapters('测试系列')).rejects.toThrow('网络错误');
            expect(store.error).toBe('网络错误');
            expect(store.loading).toBe(false);
        });
    });

    describe('loadLevelNodes', () => {
        it('加载层级节点并缓存', async () => {
            const mockNodes = [{ name: '第一卷', type: 'directory' }];
            catalogApi.getLevelNodes.mockResolvedValue(mockNodes);

            const store = useChapterStore();
            const result = await store.loadLevelNodes('测试系列', '');

            expect(result).toEqual(mockNodes);
            expect(store.levelCache.get('')).toEqual(mockNodes);
        });

        it('使用缓存避免重复请求', async () => {
            const mockNodes = [{ name: '第一卷', type: 'directory' }];
            catalogApi.getLevelNodes.mockResolvedValue(mockNodes);

            const store = useChapterStore();
            store.setLevelCache('', mockNodes);

            const result = await store.loadLevelNodes('测试系列', '');

            expect(catalogApi.getLevelNodes).not.toHaveBeenCalled();
            expect(result).toEqual(mockNodes);
        });
    });

    describe('setCurrentChapterIndex', () => {
        it('设置有效的章节索引', () => {
            const store = useChapterStore();
            store.flatList = [
                { path_id: '第1话' },
                { path_id: '第2话' },
                { path_id: '第3话' }
            ];

            store.setCurrentChapterIndex(1);

            expect(store.currentIndex).toBe(1);
        });

        it('无效索引设置为 -1', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }];

            store.setCurrentChapterIndex(5);

            expect(store.currentIndex).toBe(-1);
        });

        it('负索引设置为 -1', () => {
            const store = useChapterStore();

            store.setCurrentChapterIndex(-1);

            expect(store.currentIndex).toBe(-1);
        });
    });

    describe('setCurrentChapterByPathId', () => {
        it('通过 path_id 设置章节索引', () => {
            const store = useChapterStore();
            store.flatList = [
                { path_id: '第一卷/第1话' },
                { path_id: '第一卷/第2话' },
                { path_id: '第一卷/第3话' }
            ];

            store.setCurrentChapterByPathId('第一卷/第2话');

            expect(store.currentIndex).toBe(1);
        });

        it('未找到 path_id 时索引为 -1', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }];

            store.setCurrentChapterByPathId('不存在');

            expect(store.currentIndex).toBe(-1);
        });
    });

    describe('levelCache', () => {
        it('setLevelCache 和 getLevelCache', () => {
            const store = useChapterStore();
            const nodes = [{ name: '第一卷' }];

            store.setLevelCache('第一卷', nodes);

            expect(store.getLevelCache('第一卷')).toEqual(nodes);
        });

        it('clearLevelCache 清除缓存', () => {
            const store = useChapterStore();
            store.setLevelCache('path', [{ name: 'test' }]);

            store.clearLevelCache();

            expect(store.levelCache.size).toBe(0);
        });
    });

    describe('章节导航', () => {
        beforeEach(() => {
            const store = useChapterStore();
            store.flatList = [
                { path_id: '第1话' },
                { path_id: '第2话' },
                { path_id: '第3话' }
            ];
            store.currentIndex = 1;
        });

        it('getNextChapter 返回下一章节', () => {
            const store = useChapterStore();

            expect(store.getNextChapter()).toEqual({ path_id: '第3话' });
        });

        it('getPrevChapter 返回上一章节', () => {
            const store = useChapterStore();

            expect(store.getPrevChapter()).toEqual({ path_id: '第1话' });
        });

        it('最后章节无下一章', () => {
            const store = useChapterStore();
            store.currentIndex = 2;

            expect(store.getNextChapter()).toBeNull();
        });

        it('第一章节无上一章', () => {
            const store = useChapterStore();
            store.currentIndex = 0;

            expect(store.getPrevChapter()).toBeNull();
        });
    });

    describe('getters', () => {
        it('hasChapters 返回是否有章节', () => {
            const store = useChapterStore();

            expect(store.hasChapters).toBe(false);

            store.flatList = [{ path_id: '第1话' }];

            expect(store.hasChapters).toBe(true);
        });

        it('totalChapters 返回总数', () => {
            const store = useChapterStore();
            store.flatList = [{}, {}, {}];

            expect(store.totalChapters).toBe(3);
        });

        it('hasNextChapter 和 hasPrevChapter', () => {
            const store = useChapterStore();
            store.flatList = [{}, {}, {}];
            store.currentIndex = 1;

            expect(store.hasNextChapter).toBe(true);
            expect(store.hasPrevChapter).toBe(true);

            store.currentIndex = 2;
            expect(store.hasNextChapter).toBe(false);

            store.currentIndex = 0;
            expect(store.hasPrevChapter).toBe(false);
        });

        it('currentChapter getter', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: 'A' }, { path_id: 'B' }];
            store.currentIndex = 1;

            expect(store.currentChapter).toEqual({ path_id: 'B' });
        });
    });

    describe('metaCache', () => {
        it('getChapterMeta 调用缓存', async () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }];

            await store.getChapterMeta(0);

            expect(store.metaCache.getOrFetch).toHaveBeenCalledWith(0);
        });

        it('getChapterMetaByPathId 调用缓存', async () => {
            const store = useChapterStore();

            await store.getChapterMetaByPathId('第1话');

            expect(store.metaCache.getOrFetchByPathId).toHaveBeenCalledWith('第1话');
        });

        it('clearMetaCache 调用缓存清除', () => {
            const store = useChapterStore();

            store.clearMetaCache();

            expect(store.metaCache.clear).toHaveBeenCalled();
        });
    });

    describe('$reset', () => {
        it('重置整个 store 状态', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: 'A' }];
            store.tree = [{ name: 'root' }];
            store.currentIndex = 0;
            store.setLevelCache('path', [{}]);
            store.loading = true;
            store.error = '错误';

            store.$reset();

            expect(store.flatList).toEqual([]);
            expect(store.tree).toEqual([]);
            expect(store.currentIndex).toBe(-1);
            expect(store.levelCache.size).toBe(0);
            expect(store.loading).toBe(false);
            expect(store.error).toBeNull();
            expect(store.metaCache.clear).toHaveBeenCalled();
        });
    });
});