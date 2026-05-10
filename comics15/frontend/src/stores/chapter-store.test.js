import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChapterStore } from './chapter-store.js';

vi.mock('../services/api.js', () => ({
    api: {
        getLevelNodes: vi.fn()
    }
}));

vi.mock('../utils/chapter-tree.js', () => ({
    buildChapterTree: vi.fn()
}));

vi.mock('../services/chapter-meta-cache.js', () => ({
    ChapterMetaCache: vi.fn().mockImplementation(() => ({
        cache: new Map(),
        pathIdCache: new Map(),
        clear: vi.fn(),
        getOrFetch: vi.fn().mockResolvedValue({ totalPages: 0, files: [], coverUrl: '', coverSource: '' }),
        getOrFetchByPathId: vi.fn().mockResolvedValue({ totalPages: 0, files: [], coverUrl: '', coverSource: '' })
    }))
}));

import { api } from '../services/api.js';
import { buildChapterTree } from '../utils/chapter-tree.js';

describe('chapter-store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('loadChapters', () => {
        it('通过层级 API 递归加载所有章节并构建树', async () => {
            const rootNodes = [
                { name: '第一卷', type: 'directory', path: '第一卷' },
                { name: '第二卷', type: 'directory', path: '第二卷' }
            ];
            const volume1Nodes = [
                { path_id: '第一卷/第1话', name: '第1话', type: 'chapter' },
                { path_id: '第一卷/第2话', name: '第2话', type: 'chapter' }
            ];
            const volume2Nodes = [
                { path_id: '第二卷/第1话', name: '第1话', type: 'chapter' }
            ];
            const mockTree = { name: 'root', children: [] };

            api.getLevelNodes
                .mockResolvedValueOnce(rootNodes)
                .mockResolvedValueOnce(volume1Nodes)
                .mockResolvedValueOnce(volume2Nodes);
            buildChapterTree.mockReturnValue(mockTree);

            const store = useChapterStore();
            const result = await store.loadChapters('测试系列');

            const expectedChapters = [
                { path_id: '第一卷/第1话', name: '第1话', type: 'chapter' },
                { path_id: '第一卷/第2话', name: '第2话', type: 'chapter' },
                { path_id: '第二卷/第1话', name: '第1话', type: 'chapter' }
            ];
            expect(result.flatList).toEqual(expectedChapters);
            expect(result.tree).toEqual(mockTree);
            expect(store.flatList).toEqual(expectedChapters);
            expect(store.tree).toEqual(mockTree);
            expect(store.loading).toBe(false);
        });

        it('加载时清除元数据缓存', async () => {
            api.getLevelNodes.mockResolvedValue([]);
            buildChapterTree.mockReturnValue({});

            const store = useChapterStore();
            await store.loadChapters('测试系列');

            expect(store.metaCache.clear).toHaveBeenCalled();
        });

        it('处理 API 错误', async () => {
            api.getLevelNodes.mockRejectedValue(new Error('网络错误'));

            const store = useChapterStore();

            await expect(store.loadChapters('测试系列')).rejects.toThrow('网络错误');
            expect(store.error).toBe('网络错误');
            expect(store.loading).toBe(false);
        });
    });

    describe('loadLevelNodes', () => {
        it('加载层级节点并缓存', async () => {
            const mockNodes = [{ name: '第一卷', type: 'directory' }];
            api.getLevelNodes.mockResolvedValue(mockNodes);

            const store = useChapterStore();
            const result = await store.loadLevelNodes('测试系列', '');

            expect(result).toEqual(mockNodes);
            expect(store.levelCache.get('')).toEqual(mockNodes);
        });

        it('使用缓存避免重复请求', async () => {
            const mockNodes = [{ name: '第一卷', type: 'directory' }];
            api.getLevelNodes.mockResolvedValue(mockNodes);

            const store = useChapterStore();
            store.setLevelCache('', mockNodes);

            const result = await store.loadLevelNodes('测试系列', '');

            expect(api.getLevelNodes).not.toHaveBeenCalled();
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

    describe('getChapterAtIndex', () => {
        it('获取指定索引的章节', () => {
            const store = useChapterStore();
            store.flatList = [
                { path_id: '第1话' },
                { path_id: '第2话' },
                { path_id: '第3话' }
            ];

            const chapter = store.getChapterAtIndex(1);

            expect(chapter).toEqual({ path_id: '第2话' });
        });

        it('无效索引返回 null', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }];

            const chapter = store.getChapterAtIndex(5);

            expect(chapter).toBeNull();
        });
    });

    describe('getCurrentChapter', () => {
        it('获取当前章节', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }, { path_id: '第2话' }];
            store.currentIndex = 1;

            const chapter = store.getCurrentChapter();

            expect(chapter).toEqual({ path_id: '第2话' });
        });
    });

    describe('getNextChapter', () => {
        it('获取下一章', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }, { path_id: '第2话' }, { path_id: '第3话' }];
            store.currentIndex = 0;

            const next = store.getNextChapter();

            expect(next).toEqual({ path_id: '第2话' });
        });

        it('最后一章返回 null', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }, { path_id: '第2话' }];
            store.currentIndex = 1;

            const next = store.getNextChapter();

            expect(next).toBeNull();
        });
    });

    describe('getPrevChapter', () => {
        it('获取上一章', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }, { path_id: '第2话' }, { path_id: '第3话' }];
            store.currentIndex = 2;

            const prev = store.getPrevChapter();

            expect(prev).toEqual({ path_id: '第2话' });
        });

        it('第一章返回 null', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }, { path_id: '第2话' }];
            store.currentIndex = 0;

            const prev = store.getPrevChapter();

            expect(prev).toBeNull();
        });
    });

    describe('$reset', () => {
        it('重置所有状态', () => {
            const store = useChapterStore();
            store.flatList = [{ path_id: '第1话' }];
            store.tree = { children: [] };
            store.currentIndex = 0;
            store.loading = true;
            store.error = '错误';

            store.$reset();

            expect(store.flatList).toEqual([]);
            expect(store.tree).toEqual([]);
            expect(store.currentIndex).toBe(-1);
            expect(store.loading).toBe(false);
            expect(store.error).toBeNull();
            expect(store.metaCache.clear).toHaveBeenCalled();
        });
    });
});
