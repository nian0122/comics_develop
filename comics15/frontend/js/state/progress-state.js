// 阅读进度状态管理

import { storage } from '../services/storage.js';

export const progressState = {
    currentPage: 1,
    totalPages: 0,
    loadedPages: 0,
    scrollPercent: 0,
    lastReadTime: 0,

    init(total) {
        this.totalPages = total;
        this.currentPage = 1;
        this.loadedPages = 0;
        this.scrollPercent = 0;
        this.lastReadTime = Date.now();
    },

    setCurrentPage(page) {
        this.currentPage = Math.max(1, Math.min(page, this.totalPages));
        this.lastReadTime = Date.now();
        this.saveToStorage();
    },

    setLoadedPages(count) {
        this.loadedPages = Math.min(count, this.totalPages);
    },

    updateScrollPercent(percent) {
        this.scrollPercent = Math.max(0, Math.min(100, percent));
        this.lastReadTime = Date.now();
    },

    getDisplayText() {
        const percent = this.totalPages > 0
            ? Math.round((this.currentPage / this.totalPages) * 100)
            : 0;
        return `${this.currentPage} / ${this.totalPages} (${percent}%)`;
    },

    getBriefText() {
        return `${this.currentPage} / ${this.totalPages}`;
    },

    saveToStorage() {
        const currentSeries = window.__appState?.series?.current;
        const currentIndex = window.__appState?.chapters?.currentIndex;
        if (!currentSeries || currentIndex < 0) return;

        storage.setProgress(currentSeries, currentIndex, {
            page: this.currentPage,
            scrollPercent: this.scrollPercent,
            timestamp: this.lastReadTime
        });
    },

    restoreFromStorage(series, index) {
        if (!series || index < 0) return null;
        const data = storage.getProgress(series, index);
        if (data) {
            this.currentPage = data.page || 1;
            this.scrollPercent = data.scrollPercent || 0;
            this.lastReadTime = data.timestamp || 0;
            return data;
        }
        return null;
    },

    clearCurrentProgress() {
        const currentSeries = window.__appState?.series?.current;
        const currentIndex = window.__appState?.chapters?.currentIndex;
        if (!currentSeries || currentIndex < 0) return;
        localStorage.removeItem(storage.getProgressKey(currentSeries, currentIndex));
    }
};