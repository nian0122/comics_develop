// 移动端优先应用入口

import { store } from './state/store.js';
import { api, persistence } from './services/index.js';
import { Reader } from './components/index.js';
import { $ } from './utils/dom.js';
import { buildChapterTree, getInitialDirectoryPath, getParentPath } from './utils/chapter-tree.js';
import { ChapterMetaCache, SeriesView, DirectoryView, ReaderShell } from './app/index.js';
import { Router, toDirectoryUrl, toReaderUrl, toSeriesListUrl, toSeriesUrl } from './router/index.js';

class App {
    constructor() {
        this.reader = null;
        this.chapterMetaCache = new ChapterMetaCache();
        this.seriesView = null;
        this.directoryView = null;
        this.readerShell = null;
        this.router = new Router((route) => this.renderRoute(route));

        this.elements = {
            seriesView: $('#seriesView'),
            directoryView: $('#directoryView'),
            readerView: $('#readerView'),
            reader: $('#reader'),
        };
    }

    async init() {
        this.initViews();
        this.reader = new Reader({
            onImageLoaded: () => this.readerShell.updateProgressStatus(),
            onPageChanged: () => this.readerShell.updateProgressStatus(),
            onStatusUpdate: ({ message }) => console.info(message),
        });
        this.bindGlobalEvents();
        await this.loadSeries();
        if (window.location.pathname === '/') {
            await this.restoreLastRoute();
        } else {
            this.router.start();
        }
    }

    initViews() {
        this.seriesView = new SeriesView(this.elements.seriesView, {
            onSelectSeries: (name) => this.router.navigate(toSeriesUrl(name)),
            onRetry: () => this.loadSeries(),
        });

        this.directoryView = new DirectoryView(this.elements.directoryView, this.chapterMetaCache, {
            onShowSeries: () => this.router.navigate(toSeriesListUrl()),
            onOpenChapter: (index) => this.navigateToChapter(index),
            onRenderDirectory: (path) => this.router.navigate(toDirectoryUrl(store.series.current, path)),
            onRetrySeries: (name) => this.selectSeries(name),
        });

        this.readerShell = new ReaderShell(this.elements.readerView, this.elements.reader, {
            onOpenPrev: () => this.openPrevChapter(),
            onOpenNext: () => this.openNextChapter(),
            onBackToDirectory: () => this.backToDirectory(),
            onJumpToPage: (pageNum) => this.reader.jumpToPage(pageNum),
        });
    }

    bindGlobalEvents() {
        this.readerShell.bindEvents();

        document.addEventListener('keydown', (event) => this.handleKeyboard(event));
    }

    handleKeyboard(event) {
        if (document.activeElement?.tagName === 'INPUT') return;
        if (event.key === 'ArrowLeft') {
            this.openPrevChapter();
            event.preventDefault();
        }
        if (event.key === 'ArrowRight') {
            this.openNextChapter();
            event.preventDefault();
        }
        if ((event.key === 'g' || event.key === 'G') && !event.ctrlKey && !event.metaKey && !event.altKey) {
            this.readerShell.showJumpModal();
            event.preventDefault();
        }
    }

    async loadSeries() {
        this.seriesView.renderLoading();
        try {
            const series = await api.getSeries();
            store.setSeries(series);
            this.seriesView.renderList(series);
        } catch (error) {
            console.error('加载系列失败:', error);
            this.seriesView.renderError();
        }
    }

    async restoreLastRoute() {
        const savedSeries = persistence.getCurrentSeries();
        if (!savedSeries || !store.series.list.includes(savedSeries)) {
            this.router.start();
            return;
        }

        const savedChapterPath = persistence.getCurrentChapterPath();
        const url = savedChapterPath
            ? toReaderUrl(savedSeries, savedChapterPath)
            : toSeriesUrl(savedSeries);
        this.router.replace(url);
    }

    async selectSeries(name, options = {}) {
        store.setCurrentSeries(name);
        store.setNavigation('', '');
        this.chapterMetaCache.clear();
        this.directoryView.renderLoading(name);

        try {
            const flatChapters = await api.getChapters(name);
            const tree = buildChapterTree(flatChapters);
            store.setChapters(flatChapters, tree);
            const savedChapterPath = persistence.getCurrentChapterPath();
            const initialPath = getInitialDirectoryPath(
                flatChapters,
                savedChapterPath,
                options.restoreLastChapter === true
            );
            this.renderDirectory(initialPath);
        } catch (error) {
            console.error('加载章节失败:', error);
            this.directoryView.renderError(name);
        }
    }

    renderDirectory(path) {
        this.showView('directoryBrowser');
        this.directoryView.renderDirectory(path);
    }

    async openChapter(index, isUiSelection = false) {
        if (store.reader.isLoading || index < 0 || index >= store.chapters.flatList.length) return;
        store.setCurrentChapterIndex(index);
        const chapter = store.chapters.flatList[index];
        store.setNavigation(store.navigation.currentPath, getParentPath(chapter.path_id));
        store.setCurrentChapter(chapter);
        this.showView('reader');
        this.readerShell.hideActions();
        this.readerShell.resetUi();

        try {
            store.setReaderLoading(true);
            const meta = await this.chapterMetaCache.getOrFetch(index);
            const files = meta.files.length > 0
                ? meta.files
                : (await api.getChapterFiles(store.series.current, chapter.path_id)).files || [];
            store.setReaderFiles(files);
            await this.reader.loadChapter(files, chapter, store.series.current);
            this.readerShell.updateProgressStatus();
            persistence.saveCurrentPosition(store.series.current, chapter.path_id);
            if (isUiSelection) this.elements.reader.scrollTop = 0;
            this.preloadNeighborChapter(index + 1);
        } catch (error) {
            console.error('加载章节失败:', error);
            this.elements.reader.innerHTML = '<div class="mobile-state-card error-state">无法加载章节文件列表，请检查后端服务。</div>';
        } finally {
            store.setReaderLoading(false);
        }
    }

    async preloadNeighborChapter(index) {
        if (index >= store.chapters.flatList.length || this.chapterMetaCache.has(index)) return;
        await this.chapterMetaCache.getOrFetch(index);
    }

    openPrevChapter() {
        this.navigateToChapter(store.chapters.currentIndex - 1);
    }

    openNextChapter() {
        this.navigateToChapter(store.chapters.currentIndex + 1);
    }

    backToDirectory() {
        this.router.navigate(toDirectoryUrl(store.series.current, store.navigation.returnPath || ''));
    }


    async renderRoute(route) {
        if (route.name === 'seriesList') {
            this.showView('seriesList');
            return;
        }

        if (route.name === 'directory') {
            await this.ensureSeriesLoaded(route.series);
            this.renderDirectory(route.path);
            return;
        }

        if (route.name === 'reader') {
            await this.ensureSeriesLoaded(route.series);
            const index = store.chapters.flatList.findIndex(chapter => chapter.path_id === route.path);
            if (index === -1) {
                this.renderDirectory('');
                return;
            }
            await this.openChapter(index);
            return;
        }

        this.showView('seriesList');
    }

    async ensureSeriesLoaded(series) {
        if (store.series.current === series && store.chapters.flatList.length > 0) return;
        await this.selectSeries(series);
    }

    navigateToChapter(index) {
        if (index < 0 || index >= store.chapters.flatList.length) return;
        const chapter = store.chapters.flatList[index];
        this.router.navigate(toReaderUrl(store.series.current, chapter.path_id));
    }

    showView(view) {
        if (view !== 'directoryBrowser') {
            this.directoryView.cleanupChapterCovers();
        }
        store.setCurrentView(view);
        this.seriesView.container.classList.toggle('hidden', view !== 'seriesList');
        this.directoryView.container.classList.toggle('hidden', view !== 'directoryBrowser');
        this.readerShell.readerView.classList.toggle('hidden', view !== 'reader');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});