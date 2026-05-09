import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectoryView } from './directory-view.js';
import { store } from '../state/store.js';
import { storage } from '../services/storage.js';

describe('DirectoryView', () => {
    let container;
    let chapterMetaCache;

    beforeEach(() => {
        document.body.innerHTML = '<section id="directoryView"></section>';
        container = document.querySelector('#directoryView');

        store.series.current = '测试系列';
        store.navigation.currentPath = '';

        chapterMetaCache = {
            getOrFetchByPathId: vi.fn().mockResolvedValue({
                totalPages: 0,
                coverUrl: null,
                coverSource: 'none',
            }),
        };

        vi.spyOn(storage, 'getSeriesProgress').mockReturnValue({
            '第一卷/第1话': { page: 2 },
        });

        globalThis.IntersectionObserver = class {
            observe() {}
            disconnect() {}
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('渲染目录行、章节卡片和返回按钮', () => {
        const view = new DirectoryView(container, chapterMetaCache);
        view.renderLevelNodes('', [
            { type: 'directory', path: '第一卷', name: '第一卷' },
            { type: 'chapter', path_id: '第一卷/第1话', name: '第1话', total_files: 12 },
        ]);

        expect(container.querySelectorAll('.directory-row')).toHaveLength(1);
        expect(container.querySelectorAll('.chapter-card-v2')).toHaveLength(1);
        expect(container.querySelector('.text-back-btn')).not.toBeNull();
    });

    it('空目录显示 mobile-state-card 提示', () => {
        const view = new DirectoryView(container, chapterMetaCache);
        view.renderLevelNodes('', []);

        expect(container.querySelector('.mobile-state-card')).not.toBeNull();
    });

    it('点击目录行触发 onRenderDirectory', () => {
        const onRenderDirectory = vi.fn();
        const view = new DirectoryView(container, chapterMetaCache, { onRenderDirectory });
        view.renderLevelNodes('', [
            { type: 'directory', path: '第一卷/子目录', name: '子目录' },
        ]);

        container.querySelector('.directory-row')?.click();

        expect(onRenderDirectory).toHaveBeenCalledTimes(1);
        expect(onRenderDirectory).toHaveBeenCalledWith('第一卷/子目录');
    });

    it('点击章节卡片触发 onOpenChapter(pathId, true)', () => {
        const onOpenChapter = vi.fn();
        const view = new DirectoryView(container, chapterMetaCache, { onOpenChapter });
        view.renderLevelNodes('', [
            { type: 'chapter', path_id: '第一卷/第1话', name: '第1话', total_files: 15 },
        ]);

        container.querySelector('.chapter-card-v2')?.click();

        expect(onOpenChapter).toHaveBeenCalledTimes(1);
        expect(onOpenChapter).toHaveBeenCalledWith('第一卷/第1话', true);
    });

    it('根目录点击返回按钮时回到系列列表', () => {
        const onShowSeries = vi.fn();
        const view = new DirectoryView(container, chapterMetaCache, { onShowSeries });

        store.navigation.currentPath = '';
        view.renderLevelNodes('', [
            { type: 'directory', path: '第一卷', name: '第一卷' },
        ]);

        container.querySelector('.text-back-btn')?.click();

        expect(onShowSeries).toHaveBeenCalledTimes(1);
    });

    it('子目录点击返回按钮时回到父目录', () => {
        const onRenderDirectory = vi.fn();
        const view = new DirectoryView(container, chapterMetaCache, { onRenderDirectory });

        store.navigation.currentPath = '第一卷/子目录';
        view.renderLevelNodes('第一卷/子目录', [
            { type: 'chapter', path_id: '第一卷/子目录/第2话', name: '第2话', total_files: 20 },
        ]);

        container.querySelector('.text-back-btn')?.click();

        expect(onRenderDirectory).toHaveBeenCalledTimes(1);
        expect(onRenderDirectory).toHaveBeenCalledWith('第一卷');
    });
});
