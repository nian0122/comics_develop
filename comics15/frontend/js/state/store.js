// 全局状态管理

import { LAZY_LOAD_CONFIG, IMAGE_RETRY_CONFIG } from '../config/constants.js';

export const store = {
    series: {
        list: [],
        current: null,
    },

    chapters: {
        flatList: [],
        tree: [],
        currentIndex: -1,
    },

    reader: {
        files: [],
        loadedCount: 0,
        isLoading: false,
        scale: 100,
    },

    preload: {
        nextChapterFiles: null,
        nextChapterIndex: -1,
    },

    ui: {
        sidebarVisible: false,
        headerVisible: true,
        footerVisible: true,
    },

    lazyLoad: {
        observer: null,
        nextToObserve: 0,
        loadedCount: 0,
        isObserving: false
    },

    imageRetry: new Map(),

    _listeners: new Map(),

    subscribe(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);
        return () => this._listeners.get(key).delete(callback);
    },

    notify(key) {
        const listeners = this._listeners.get(key);
        if (listeners) {
            listeners.forEach(cb => cb(this[key]));
        }
    },

    setSeries(list, current = null) {
        this.series.list = list;
        this.series.current = current;
        this.notify('series');
    },

    setCurrentSeries(name) {
        this.series.current = name;
        this.notify('series');
    },

    setChapters(flatList, tree = []) {
        this.chapters.flatList = flatList;
        this.chapters.tree = tree;
        this.notify('chapters');
    },

    setCurrentChapterIndex(index) {
        this.chapters.currentIndex = index;
        this.notify('chapters');
    },

    setReaderFiles(files) {
        this.reader.files = files;
        this.reader.loadedCount = 0;
        this.notify('reader');
    },

    setReaderLoading(loading) {
        this.reader.isLoading = loading;
        this.notify('reader');
    },

    setReaderScale(scale) {
        this.reader.scale = scale;
        this.notify('reader');
    },

    resetReader() {
        this.reader.files = [];
        this.reader.loadedCount = 0;
        this.reader.isLoading = false;
        this.preload.nextChapterFiles = null;
        this.preload.nextChapterIndex = -1;
        this.notify('reader');
    },

    resetLazyLoad() {
        if (this.lazyLoad.observer) {
            this.lazyLoad.observer.disconnect();
            this.lazyLoad.observer = null;
        }
        this.imageRetry.forEach((state) => {
            if (state.timeoutId) {
                clearTimeout(state.timeoutId);
            }
        });
        this.imageRetry.clear();
        this.lazyLoad.nextToObserve = 0;
        this.lazyLoad.loadedCount = 0;
        this.notify('lazyLoad');
    }
};

window.__appState = store;