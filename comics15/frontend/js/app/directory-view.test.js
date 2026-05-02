import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryView } from './directory-view.js';

vi.mock('../state/store.js', () => ({
    store: {
        series: { current: 'Series' },
        chapters: { tree: [], flatList: [] },
        navigation: { currentPath: '' },
        setNavigation: vi.fn(),
    },
}));

vi.mock('../services/storage.js', () => ({
    storage: {
        getSeriesProgress: vi.fn(() => ({})),
        getProgress: vi.fn(() => null),
    },
}));

describe('DirectoryView 封面内存清理', () => {
    let container;
    let view;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = `
            <span class="chapter-cover" data-cover-index="1" data-cover-state="loaded"><img src="/lq_image/a/1.webp" alt="1"></span>
            <span class="chapter-cover" data-cover-index="2" data-cover-state="loaded"><img src="/lq_image/a/2.webp" alt="2"></span>
        `;
        view = new DirectoryView(container, { getOrFetch: vi.fn() }, {
            coverLoadPolicy: {
                maxConcurrent: 1,
                rootMargin: '0px',
                unloadDelayMs: 1200,
                maxActiveCovers: 16,
            },
        });
    });

    it('cleanupChapterCovers 断开 observer、清空队列并卸载所有首图', () => {
        const disconnect = vi.fn();
        const clear = vi.fn();
        view.coverObserver = { disconnect };
        view.coverLoadQueue.clear = clear;
        const originalToken = view.coverLoadToken;

        view.cleanupChapterCovers();

        expect(disconnect).toHaveBeenCalled();
        expect(view.coverObserver).toBeNull();
        expect(clear).toHaveBeenCalled();
        expect(view.coverLoadToken).toBe(originalToken + 1);
        expect(container.querySelectorAll('img')).toHaveLength(0);
        expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
    });

    it('离屏封面按低内存策略延迟卸载，避免滚动抖动反复解码', () => {
        const coverEl = container.querySelector('[data-cover-index="1"]');

        view.scheduleCoverUnload(coverEl);

        expect(coverEl.querySelector('img')).not.toBeNull();
        vi.advanceTimersByTime(1199);
        expect(coverEl.querySelector('img')).not.toBeNull();
        vi.advanceTimersByTime(1);
        expect(coverEl.querySelector('img')).toBeNull();
    });

    it('活跃封面超过上限时即使旧封面仍标记可见也必须卸载，强制限制真实 img 数量', () => {
        container.innerHTML = `
            <span class="chapter-cover" data-cover-index="1" data-cover-visible="true" data-cover-state="loaded"><img src="/lq_image/a/1.webp" alt="1"></span>
            <span class="chapter-cover" data-cover-index="2" data-cover-visible="true" data-cover-state="loaded"><img src="/lq_image/a/2.webp" alt="2"></span>
            <span class="chapter-cover" data-cover-index="3" data-cover-visible="true" data-cover-state="loaded"><img src="/lq_image/a/3.webp" alt="3"></span>
        `;
        view.coverLoadPolicy.maxActiveCovers = 2;

        container.querySelectorAll('[data-cover-index]').forEach(coverEl => view.rememberActiveCover(coverEl));

        expect(container.querySelector('[data-cover-index="1"] img')).toBeNull();
        expect(container.querySelectorAll('img')).toHaveLength(2);
        expect(view.activeCoverIndexes).toEqual([2, 3]);
    });


    it('重新渲染同一封面前先走卸载流程，避免 innerHTML 直接替换旧 img', async () => {
        const oldImgLoad = vi.fn();
        container.innerHTML = `
            <span class="chapter-cover" data-cover-index="0" data-cover-visible="true" data-cover-state="idle">
                <img src="/lq_image/a/old.webp" alt="old">
            </span>
            <span data-progress-index="0"></span>
        `;
        const oldImg = container.querySelector('img');
        oldImg.load = oldImgLoad;
        const removeAttribute = vi.spyOn(Element.prototype, 'removeAttribute');
        const remove = vi.spyOn(Element.prototype, 'remove');
        const chapterMetaCache = {
            getOrFetch: vi.fn(async () => ({ totalPages: 9, coverUrl: '/lq_image/a/new.webp', coverSource: 'lq' })),
        };
        view = new DirectoryView(container, chapterMetaCache, {
            coverLoadPolicy: {
                maxConcurrent: 1,
                rootMargin: '0px',
                unloadDelayMs: 1200,
                maxActiveCovers: 16,
            },
        });
        view.findChapterNodeByIndex = vi.fn(() => ({ name: '第 1 话' }));

        await view.loadCover(container.querySelector('[data-cover-index="0"]'));

        expect(removeAttribute).toHaveBeenCalledWith('src');
        expect(oldImgLoad).toHaveBeenCalled();
        expect(remove).toHaveBeenCalled();
        removeAttribute.mockRestore();
        remove.mockRestore();
        expect(container.querySelector('img').getAttribute('src')).toBe('/lq_image/a/new.webp');
    });


    it('iOS 低内存模式下首图默认不自动加载，只显示可点击提示', () => {
        const coverMetaCache = {
            getOrFetch: vi.fn(async () => ({ totalPages: 10, coverUrl: '/lq_image/a/b.webp', coverSource: 'lq' })),
        };
        view = new DirectoryView(container, coverMetaCache, {
            coverLoadPolicy: {
                maxConcurrent: 1,
                rootMargin: '0px',
                unloadDelayMs: 1200,
                maxActiveCovers: 16,
                autoLoadCovers: false,
            },
        });

        const html = view.renderChapterCard({ flatIndex: 1, chapter: { path_id: '第 1 话' } }, null);

        expect(html).toContain('data-cover-action="load"');
        expect(html).toContain('点击加载封面');
    });


    it('点击 iOS 手动封面提示只加载封面，不打开章节', () => {
        const onOpenChapter = vi.fn();
        view = new DirectoryView(container, { getOrFetch: vi.fn() }, {
            coverLoadPolicy: {
                maxConcurrent: 1,
                rootMargin: '0px',
                unloadDelayMs: 1200,
                maxActiveCovers: 4,
                autoLoadCovers: false,
            },
            onOpenChapter,
        });
        view.enqueueCoverLoad = vi.fn();
        container.innerHTML = `
            <button class="chapter-card" data-index="1">
                <span class="chapter-cover chapter-cover-manual" data-cover-index="1" data-cover-action="load">点击加载封面</span>
            </button>
        `;
        view.bindRows();

        container.querySelector('[data-cover-action="load"]').click();

        expect(view.enqueueCoverLoad).toHaveBeenCalledWith(container.querySelector('[data-cover-action="load"]'));
        expect(onOpenChapter).not.toHaveBeenCalled();
    });

});
