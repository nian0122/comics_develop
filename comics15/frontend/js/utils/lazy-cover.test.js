import { describe, it, expect, vi } from 'vitest';
import { getUnloadedCoverIndexes, markCoverLoading, markCoverLoaded, unloadCoverImage } from './lazy-cover.js';

describe('lazy-cover helpers', () => {
    it('只返回尚未加载且未加载中的章节首图索引', () => {
        document.body.innerHTML = `
            <span data-cover-index="1" data-cover-state="idle"></span>
            <span data-cover-index="2" data-cover-state="loading"></span>
            <span data-cover-index="3" data-cover-state="loaded"></span>
            <span data-cover-index="4"></span>
        `;

        expect(getUnloadedCoverIndexes(document.body)).toEqual([1, 4]);
    });

    it('标记首图加载状态，防止重复请求', () => {
        const coverEl = document.createElement('span');

        markCoverLoading(coverEl);
        expect(coverEl.dataset.coverState).toBe('loading');

        markCoverLoaded(coverEl);
        expect(coverEl.dataset.coverState).toBe('loaded');
    });

    it('卸载已加载首图并恢复为可再次懒加载状态', () => {
        document.body.innerHTML = '<span class="chapter-cover" data-cover-index="7" data-cover-state="loaded"><img src="/lq_image/a/b.webp" alt="首图"></span>';
        const coverEl = document.querySelector('[data-cover-index="7"]');

        unloadCoverImage(coverEl);

        expect(coverEl.dataset.coverState).toBeUndefined();
        expect(coverEl.querySelector('img')).toBeNull();
        expect(coverEl.textContent).toBe('');
        expect(coverEl.classList.contains('skeleton')).toBe(true);
        expect(getUnloadedCoverIndexes(document.body)).toEqual([7]);
    });


    it('卸载首图时移除 src 属性和 img 节点，帮助 iOS 释放解码资源', () => {
        const coverEl = document.createElement('span');
        coverEl.className = 'chapter-cover';
        coverEl.dataset.coverIndex = '8';
        coverEl.dataset.coverState = 'loaded';
        const imgEl = document.createElement('img');
        imgEl.src = '/lq_image/a/c.webp';
        imgEl.load = vi.fn();
        const removeAttribute = vi.spyOn(imgEl, 'removeAttribute');
        const remove = vi.spyOn(imgEl, 'remove');
        coverEl.appendChild(imgEl);

        unloadCoverImage(coverEl);

        expect(removeAttribute).toHaveBeenCalledWith('src');
        expect(imgEl.load).toHaveBeenCalled();
        expect(remove).toHaveBeenCalled();
        expect(coverEl.querySelector('img')).toBeNull();
        expect(coverEl.dataset.coverState).toBeUndefined();
    });

});
