import { describe, expect, it } from 'vitest';
import { getReaderMenuVisibilityState } from './reader-controls.js';

describe('reader controls', () => {
    it('向下滚动时隐藏菜单按钮', () => {
        expect(getReaderMenuVisibilityState({ previousScrollTop: 10, currentScrollTop: 42 })).toEqual({
            shouldHide: true,
            nextScrollTop: 42,
        });
    });

    it('向上滚动时显示菜单按钮', () => {
        expect(getReaderMenuVisibilityState({ previousScrollTop: 42, currentScrollTop: 10 })).toEqual({
            shouldHide: false,
            nextScrollTop: 10,
        });
    });

    it('用户手动隐藏按钮后滚动不自动恢复', () => {
        expect(getReaderMenuVisibilityState({
            previousScrollTop: 42,
            currentScrollTop: 10,
            isManuallyHidden: true,
        })).toEqual({
            shouldHide: true,
            nextScrollTop: 10,
        });
    });
});
