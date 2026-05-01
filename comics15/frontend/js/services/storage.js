// localStorage 封装

const STORAGE_KEYS = {
    CURRENT_SERIES: 'currentSeries',
    CURRENT_CHAPTER_PATH: 'currentChapterPathId',
    EXPANDED_PATHS: 'expandedPaths',
};

export const storage = {
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('读取存储失败:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('写入存储失败:', e);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('删除存储失败:', error);
            return false;
        }
    },

    getCurrentSeries() {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_SERIES) || null;
    },

    setCurrentSeries(name) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_SERIES, name);
    },

    getCurrentChapterPath() {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAPTER_PATH) || null;
    },

    setCurrentChapterPath(pathId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CHAPTER_PATH, pathId);
    },

    getExpandedPaths() {
        const data = localStorage.getItem(STORAGE_KEYS.EXPANDED_PATHS);
        return data ? JSON.parse(data) : {};
    },

    setExpandedPath(path, isExpanded) {
        const expanded = this.getExpandedPaths();
        expanded[path] = isExpanded;
        localStorage.setItem(STORAGE_KEYS.EXPANDED_PATHS, JSON.stringify(expanded));
    },

    getProgressKey(series, index) {
        return `progress_${series}_${index}`;
    },

    getProgress(series, index) {
        const key = this.getProgressKey(series, index);
        return this.get(key);
    },

    setProgress(series, index, data) {
        const key = this.getProgressKey(series, index);
        this.set(key, data);
    },

    getSeriesProgress(seriesName) {
        const progress = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`progress_${seriesName}_`)) {
                    const data = JSON.parse(localStorage.getItem(key));
                    const chapterIndex = parseInt(key.split('_').pop());
                    progress[chapterIndex] = {
                        page: data.page,
                        percent: data.scrollPercent,
                        timestamp: data.timestamp
                    };
                }
            }
        } catch (e) {
            console.warn('获取系列阅读进度失败:', e);
        }
        return progress;
    }
};