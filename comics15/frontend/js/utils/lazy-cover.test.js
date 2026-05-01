import { describe, it, expect } from 'vitest';
import { getUnloadedCoverIndexes, markCoverLoading, markCoverLoaded } from './lazy-cover.js';

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
});
