// 全局状态管理

export const store = {
    currentView: 'seriesList',
    currentChapter: null,

    navigation: {
        currentPath: '',
        returnPath: '',
    },

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

    setCurrentView(view) {
        this.currentView = view;
        this.notify('currentView');
    },

    setCurrentChapter(chapter) {
        this.currentChapter = chapter;
        this.notify('currentChapter');
    },

    setNavigation(currentPath, returnPath = currentPath) {
        this.navigation.currentPath = currentPath;
        this.navigation.returnPath = returnPath;
        this.notify('navigation');
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

    setLazyObserver(observer) {
        this.lazyLoad.observer = observer;
        this.notify('lazyLoad');
    },

    setLazyNextToObserve(index) {
        this.lazyLoad.nextToObserve = index;
        this.notify('lazyLoad');
    },

    setLazyLoadedCount(count) {
        this.lazyLoad.loadedCount = count;
        this.notify('lazyLoad');
    },

    incrementLazyLoadedCount() {
        this.lazyLoad.loadedCount += 1;
        this.notify('lazyLoad');
    },

    resetReader() {
        this.reader.files = [];
        this.reader.loadedCount = 0;
        this.reader.isLoading = false;
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
