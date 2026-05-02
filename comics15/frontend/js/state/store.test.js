import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from './store.js';

describe('store', () => {
    beforeEach(() => {
        store._listeners.clear();
        store.currentView = 'seriesList';
        store.currentChapter = null;
        store.navigation.currentPath = '';
        store.navigation.returnPath = '';
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


    it('notifies lazy load subscribers when loaded count changes', () => {
        const listener = vi.fn();
        store.subscribe('lazyLoad', listener);

        store.setLazyLoadedCount(2);
        store.incrementLazyLoadedCount();

        expect(store.lazyLoad.loadedCount).toBe(3);
        expect(listener).toHaveBeenLastCalledWith(store.lazyLoad);
    });

    it('does not expose debug globals or unused preload state', () => {
        expect(window.__appState).toBeUndefined();
        expect('preload' in store).toBe(false);
        expect('ui' in store).toBe(false);
        expect('setSidebarVisible' in store).toBe(false);
    });
});
