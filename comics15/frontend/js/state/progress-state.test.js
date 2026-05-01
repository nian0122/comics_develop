import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { progressState } from './progress-state.js';
import { store } from './store.js';
import { storage } from '../services/storage.js';

describe('progressState', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-01T08:00:00Z'));
        store.setCurrentSeries('测试系列');
        store.setCurrentChapterIndex(2);
        progressState.init(10);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('saves progress using store state instead of window globals', () => {
        const setProgressSpy = vi.spyOn(storage, 'setProgress').mockImplementation(() => true);
        delete window.__appState;

        progressState.updateScrollPercent(42);
        progressState.setCurrentPage(4);

        expect(setProgressSpy).toHaveBeenCalledWith('测试系列', 2, {
            page: 4,
            scrollPercent: 42,
            timestamp: Date.now()
        });
    });

    it('does not save progress without current series or valid chapter index', () => {
        const setProgressSpy = vi.spyOn(storage, 'setProgress').mockImplementation(() => true);
        store.setCurrentSeries(null);
        store.setCurrentChapterIndex(-1);

        progressState.setCurrentPage(3);

        expect(setProgressSpy).not.toHaveBeenCalled();
    });

    it('clears current progress using storage remove helper', () => {
        const removeSpy = vi.spyOn(storage, 'remove').mockImplementation(() => true);
        delete window.__appState;

        progressState.clearCurrentProgress();

        expect(removeSpy).toHaveBeenCalledWith('progress_测试系列_2');
    });
});
