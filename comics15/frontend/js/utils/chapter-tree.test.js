import { describe, it, expect } from 'vitest';
import {
    buildChapterTree,
    getLevelNodes,
    getParentPath,
    formatChapterProgress,
    getChapterDisplayName,
    getInitialDirectoryPath,
} from './chapter-tree.js';

describe('chapter-tree mobile helpers', () => {
    const chapters = [
        { path_id: '第一卷/第 10 话', name: '第 10 话' },
        { path_id: '第一卷/第 2 话', name: '第 2 话' },
        { path_id: '番外篇', name: '番外篇' },
        { path_id: '第一卷/第 1 话', name: '第 1 话' },
    ];

    it('按自然顺序构建混合目录节点', () => {
        const tree = buildChapterTree(chapters);
        const rootNodes = getLevelNodes(tree, '');
        expect(rootNodes.map(node => node.name)).toEqual(['第一卷', '番外篇']);
        expect(rootNodes[0].type).toBe('directory');
        expect(rootNodes[1].type).toBe('chapter');

        const volumeNodes = getLevelNodes(tree, '第一卷');
        expect(volumeNodes.map(node => node.name)).toEqual(['第 1 话', '第 2 话', '第 10 话']);
        expect(volumeNodes.map(node => node.flatIndex)).toEqual([3, 1, 0]);
    });

    it('返回当前路径的上一级路径', () => {
        expect(getParentPath('第一卷/第 1 话')).toBe('第一卷');
        expect(getParentPath('第一卷')).toBe('');
        expect(getParentPath('')).toBe('');
    });

    it('格式化章节阅读进度', () => {
        expect(formatChapterProgress(null, 48)).toBe('未读 · 48 页');
        expect(formatChapterProgress({ page: 12 }, 48)).toBe('读到 12 页 · 48 页');
        expect(formatChapterProgress({ page: 48 }, 48)).toBe('已读完 · 48 页');
        expect(formatChapterProgress({ page: 3 }, 0)).toBe('读到 3 页');
    });

    it('从路径中提取章节显示名称', () => {
        expect(getChapterDisplayName({ path_id: '第一卷/第 001 话', name: 'ignored' })).toBe('第 001 话');
        expect(getChapterDisplayName({ path_id: '', name: '番外篇' })).toBe('番外篇');
    });
    it('手动进入系列时停留根目录而不是恢复已读叶节点父目录', () => {
        const flatChapters = [
            { path_id: '第一卷/第 1 话', name: '第 1 话' },
            { path_id: '第二卷/第 1 话', name: '第 1 话' },
        ];

        expect(getInitialDirectoryPath(flatChapters, '第一卷/第 1 话', false)).toBe('');
        expect(getInitialDirectoryPath(flatChapters, '第一卷/第 1 话', true)).toBe('第一卷');
    });

});
