// 状态持久化统一入口

import { storage } from './storage.js';

export const persistence = {
    saveCurrentPosition(series, chapterPath) {
        if (!series || !chapterPath) return false;
        storage.setCurrentSeries(series);
        storage.setCurrentChapterPath(chapterPath);
        return true;
    },

    getCurrentSeries() {
        return storage.getCurrentSeries();
    },

    getCurrentChapterPath() {
        return storage.getCurrentChapterPath();
    },

    saveProgress(series, index, data) {
        if (!series || index < 0) return false;
        return storage.setProgress(series, index, data);
    },

    getProgress(series, index) {
        if (!series || index < 0) return null;
        return storage.getProgress(series, index);
    },

    clearProgress(series, index) {
        if (!series || index < 0) return false;
        return storage.remove(storage.getProgressKey(series, index));
    },
};
