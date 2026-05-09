import { defineStore } from 'pinia';
import { progressState } from '../../js/state/progress-state.js';
import { persistence } from '../../js/services/persistence.js';

export const useProgressStore = defineStore('progress', {
    state: () => ({
        currentPage: 1,
        totalPages: 0,
        loadedPages: 0,
        scrollPercent: 0,
        lastReadTime: 0
    }),

    actions: {
        init(total, series = null, chapterIndex = -1) {
            this.totalPages = total;
            this.currentPage = 1;
            this.loadedPages = 0;
            this.scrollPercent = 0;
            this.lastReadTime = Date.now();

            if (series && chapterIndex >= 0) {
                const saved = progressState.restoreFromStorage(series, chapterIndex);
                if (saved) {
                    this.currentPage = saved.page || 1;
                    this.scrollPercent = saved.scrollPercent || 0;
                    this.lastReadTime = saved.timestamp || 0;
                }
            }
        },

        setCurrentPage(page) {
            this.currentPage = Math.max(1, Math.min(page, this.totalPages));
            this.lastReadTime = Date.now();
        },

        setLoadedPages(count) {
            this.loadedPages = Math.min(count, this.totalPages);
        },

        updateScrollPercent(percent) {
            this.scrollPercent = Math.max(0, Math.min(100, percent));
            this.lastReadTime = Date.now();
        },

        saveToStorage(series, chapterIndex) {
            if (!series || chapterIndex < 0) return;

            persistence.saveProgress(series, chapterIndex, {
                page: this.currentPage,
                scrollPercent: this.scrollPercent,
                timestamp: this.lastReadTime
            });
        },

        restoreFromStorage(series, chapterIndex) {
            if (!series || chapterIndex < 0) return null;

            const data = persistence.getProgress(series, chapterIndex);
            if (data) {
                this.currentPage = data.page || 1;
                this.scrollPercent = data.scrollPercent || 0;
                this.lastReadTime = data.timestamp || 0;
                return data;
            }
            return null;
        },

        clearProgress(series, chapterIndex) {
            if (!series || chapterIndex < 0) return;

            persistence.clearProgress(series, chapterIndex);
            this.currentPage = 1;
            this.scrollPercent = 0;
            this.lastReadTime = 0;
        },

        syncToLegacyState(series, chapterIndex) {
            progressState.init(this.totalPages);
            progressState.setCurrentPage(this.currentPage);
            progressState.updateScrollPercent(this.scrollPercent);

            if (series && chapterIndex >= 0) {
                persistence.saveProgress(series, chapterIndex, {
                    page: this.currentPage,
                    scrollPercent: this.scrollPercent,
                    timestamp: this.lastReadTime
                });
            }
        },

        $reset() {
            this.currentPage = 1;
            this.totalPages = 0;
            this.loadedPages = 0;
            this.scrollPercent = 0;
            this.lastReadTime = 0;
        }
    },

    getters: {
        displayText: (state) => {
            const percent = state.totalPages > 0
                ? Math.round((state.currentPage / state.totalPages) * 100)
                : 0;
            return `${state.currentPage} / ${state.totalPages} (${percent}%)`;
        },

        briefText: (state) => `${state.currentPage} / ${state.totalPages}`,

        progressPercent: (state) => {
            if (state.totalPages === 0) return 0;
            return Math.round((state.currentPage / state.totalPages) * 100);
        }
    }
});