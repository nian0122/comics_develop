import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from './store.js';

describe('store', () => {
    beforeEach(() => {
        store._listeners.clear();
        store.currentView = 'seriesList';
        store.currentChapter = null;
        store.navigation.currentPath = '';
        store.navigation.returnPath = '';
        store.ui.sidebarVisible = false;
        store.lazyLoad.observer = null;
        store.lazyLoad.nextToObserve = 0;
        store.lazyLoad.loadedCount = 0;
        store.imageRetry.clear();
    });

    it('notifies subscribers when navigation changes', () => {
        const listener = vi.fn();
        store.subscribe('navigation', listener);

        store.setNavigation('第一卷', '目录');

        expect(store.navigation).toEqual({
            currentPath: '第一卷',
            returnPath: '目录'
        });
        expect(listener).toHaveBeenCalledWith(store.navigation);
    });

    it('uses current path as return path when return path is omitted', () => {
        store.setNavigation('第一卷');

        expect(store.navigation).toEqual({
            currentPath: '第一卷',
            returnPath: '第一卷'
        });
    });

    it('notifies subscribers when current view changes', () => {
        const listener = vi.fn();
        store.subscribe('currentView', listener);

        store.setCurrentView('reader');

        expect(store.currentView).toBe('reader');
        expect(listener).toHaveBeenCalledWith('reader');
    });

    it('notifies subscribers when current chapter changes', () => {
        const chapter = { path_id: '第一卷/第 1 话' };
        const listener = vi.fn();
        store.subscribe('currentChapter', listener);

        store.setCurrentChapter(chapter);

        expect(store.currentChapter).toBe(chapter);
        expect(listener).toHaveBeenCalledWith(chapter);
    });

    it('updates sidebar visibility through ui setter', () => {
        const listener = vi.fn();
        store.subscribe('ui', listener);

        store.setSidebarVisible(true);

        expect(store.ui.sidebarVisible).toBe(true);
        expect(listener).toHaveBeenCalledWith(store.ui);
    });

    it('updates lazy load state through dedicated helpers', () => {
        const observer = { disconnect: vi.fn() };

        store.setLazyObserver(observer);
        store.setLazyLoadedCount(2);
        store.incrementLazyLoadedCount();
        store.setLazyNextToObserve(5);

        expect(store.lazyLoad.observer).toBe(observer);
        expect(store.lazyLoad.loadedCount).toBe(3);
        expect(store.lazyLoad.nextToObserve).toBe(5);
    });
});
