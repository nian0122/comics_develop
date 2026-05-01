// 移动端优先应用入口

import { store, progressState } from './state/index.js';
import { api, storage } from './services/index.js';
import { Reader } from './components/index.js';
import { $, escapeHtml } from './utils/dom.js';
import {
    buildChapterTree,
    getLevelNodes,
    getParentPath,
    formatChapterProgress,
    getChapterDisplayName,
    splitChapterPath,
} from './utils/chapter-tree.js';
import { isImageFile } from './utils/file-type.js';
import { markCoverLoading, markCoverLoaded } from './utils/lazy-cover.js';

class App {
    constructor() {
        this.reader = null;
        this.chapterMetaCache = new Map();
        this.coverObserver = null;
        this.elements = {
            seriesView: $('#seriesView'),
            directoryView: $('#directoryView'),
            readerView: $('#readerView'),
            reader: $('#reader'),
            readerMenuBtn: $('#readerMenuBtn'),
            readerActions: $('#readerActions'),
            restoreFabBtn: $('#restoreFabBtn'),
            hideFabBtn: $('#hideFabBtn'),
            backToDirectoryBtn: $('#backToDirectoryBtn'),
            prevBtn: $('#prevBtn'),
            nextBtn: $('#nextBtn'),
            progressStatus: $('#progressStatus'),
            jumpModal: $('#jumpModal'),
            jumpPageInput: $('#jumpPageInput'),
            jumpCancelBtn: $('#jumpCancelBtn'),
            jumpConfirmBtn: $('#jumpConfirmBtn'),
            totalPages: $('#totalPages'),
        };
    }

    async init() {
        this.reader = new Reader();
        this.bindEvents();
        await this.loadSeries();
        await this.restoreLastSeries();
    }

    bindEvents() {
        this.elements.readerMenuBtn.onclick = () => this.toggleReaderActions();
        this.elements.restoreFabBtn.onclick = () => this.showFab();
        this.elements.hideFabBtn.onclick = () => this.hideFab();
        this.elements.backToDirectoryBtn.onclick = () => this.backToDirectory();
        this.elements.prevBtn.onclick = () => this.openPrevChapter();
        this.elements.nextBtn.onclick = () => this.openNextChapter();
        this.elements.progressStatus.onclick = () => this.showJumpModal();
        this.elements.jumpCancelBtn.onclick = () => this.hideJumpModal();
        this.elements.jumpConfirmBtn.onclick = () => this.jumpToPage();

        this.elements.jumpPageInput.onkeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.jumpToPage();
            }
            if (event.key === 'Escape') {
                this.hideJumpModal();
            }
        };

        this.elements.jumpModal.onclick = (event) => {
            if (event.target === this.elements.jumpModal) this.hideJumpModal();
        };

        this.elements.readerView.onclick = (event) => {
            if (!this.elements.readerActions.classList.contains('hidden')
                && !event.target.closest('#readerActions')
                && !event.target.closest('#readerMenuBtn')) {
                this.elements.readerActions.classList.add('hidden');
            }
        };

        document.addEventListener('keydown', (event) => this.handleKeyboard(event));
        window.addEventListener('reader:imageLoaded', () => this.updateProgressStatus());
        window.addEventListener('reader:pageChanged', () => this.updateProgressStatus());
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
            this.showJumpModal();
            event.preventDefault();
        }
    }

    async loadSeries() {
        this.renderSeriesLoading();
        try {
            const series = await api.getSeries();
            store.setSeries(series);
            this.renderSeriesList(series);
        } catch (error) {
            console.error('加载系列失败:', error);
            this.renderSeriesError();
        }
    }

    async restoreLastSeries() {
        const savedSeries = storage.getCurrentSeries();
        if (!savedSeries || !store.series.list.includes(savedSeries)) return;
        await this.selectSeries(savedSeries);
    }

    renderSeriesLoading() {
        this.elements.seriesView.innerHTML = `
            <div class="mobile-page-header">
                <p class="mobile-kicker">Library</p>
                <h1>漫画阅读器</h1>
            </div>
            <div class="mobile-state-card">正在加载系列...</div>
        `;
    }

    renderSeriesError() {
        this.elements.seriesView.innerHTML = `
            <div class="mobile-page-header">
                <p class="mobile-kicker">Library</p>
                <h1>漫画阅读器</h1>
            </div>
            <div class="mobile-state-card error-state">
                <strong>加载失败</strong>
                <span>无法连接到后端或加载系列列表。</span>
                <button id="retrySeriesBtn" class="primary-btn">重试</button>
            </div>
        `;
        $('#retrySeriesBtn')?.addEventListener('click', () => this.loadSeries());
    }

    renderSeriesList(series) {
        this.showView('seriesList');
        const items = series.map(name => `
            <button class="series-row" data-series="${escapeHtml(name)}">
                <span>${escapeHtml(name)}</span>
                <span class="row-chevron">›</span>
            </button>
        `).join('');

        this.elements.seriesView.innerHTML = `
            <div class="mobile-page-header">
                <p class="mobile-kicker">Library</p>
                <h1>漫画阅读器</h1>
                <p>选择系列，继续进入逐级目录。</p>
            </div>
            <label class="mobile-search-label" for="seriesSearch">搜索系列</label>
            <input id="seriesSearch" class="glass-input mobile-search" placeholder="搜索系列" autocomplete="off">
            <div id="seriesList" class="series-list">
                ${items || '<div class="mobile-state-card">暂无系列</div>'}
            </div>
        `;

        const seriesListEl = $('#seriesList');
        const searchEl = $('#seriesSearch');
        seriesListEl.addEventListener('click', (event) => {
            const rowEl = event.target.closest('.series-row');
            if (!rowEl) return;
            this.selectSeries(rowEl.dataset.series);
        });
        searchEl.addEventListener('input', () => this.filterSeries(searchEl.value));
    }

    filterSeries(keyword) {
        const value = keyword.trim().toLowerCase();
        const rows = this.elements.seriesView.querySelectorAll('.series-row');
        rows.forEach(rowEl => {
            rowEl.hidden = value && !rowEl.dataset.series.toLowerCase().includes(value);
        });
    }

    async selectSeries(name) {
        store.setCurrentSeries(name);
        storage.setCurrentSeries(name);
        store.navigation.currentPath = '';
        store.navigation.returnPath = '';
        this.chapterMetaCache.clear();
        this.renderDirectoryLoading(name);

        try {
            const flatChapters = await api.getChapters(name);
            const tree = buildChapterTree(flatChapters);
            store.setChapters(flatChapters, tree);
            const savedChapterPath = storage.getCurrentChapterPath();
            const savedChapter = flatChapters.find(chapter => chapter.path_id === savedChapterPath);
            this.renderDirectory(savedChapter ? getParentPath(savedChapter.path_id) : '');
        } catch (error) {
            console.error('加载章节失败:', error);
            this.renderDirectoryError(name);
        }
    }

    renderDirectoryLoading(seriesName) {
        this.showView('directoryBrowser');
        this.elements.directoryView.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="series">‹ 系列</button>
            </div>
            <div class="mobile-page-header compact">
                <h1>${escapeHtml(seriesName)}</h1>
                <p>正在加载目录...</p>
            </div>
        `;
        this.bindDirectoryStaticActions();
    }

    renderDirectoryError(seriesName) {
        this.elements.directoryView.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="series">‹ 系列</button>
            </div>
            <div class="mobile-state-card error-state">
                <strong>加载失败</strong>
                <span>无法加载 ${escapeHtml(seriesName)} 的章节目录。</span>
                <button id="retryDirectoryBtn" class="primary-btn">重试</button>
            </div>
        `;
        this.bindDirectoryStaticActions();
        $('#retryDirectoryBtn')?.addEventListener('click', () => this.selectSeries(seriesName));
    }

    renderDirectory(path) {
        store.navigation.currentPath = path;
        store.navigation.returnPath = path;
        this.showView('directoryBrowser');

        const nodes = getLevelNodes(store.chapters.tree, path);
        const title = path ? splitChapterPath(path).at(-1) : store.series.current;
        const backText = path ? `‹ ${getParentPath(path) || store.series.current}` : '‹ 系列';
        const progress = storage.getSeriesProgress(store.series.current);
        const items = nodes.map(node => node.type === 'directory'
            ? this.renderDirectoryRow(node)
            : this.renderChapterCard(node, progress[node.flatIndex])
        ).join('');

        this.elements.directoryView.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="back">${escapeHtml(backText)}</button>
            </div>
            <div class="mobile-page-header compact">
                <p class="mobile-kicker">${escapeHtml(store.series.current || '')}</p>
                <h1>${escapeHtml(title || '目录')}</h1>
            </div>
            <div class="directory-list">
                ${items || '<div class="mobile-state-card">当前目录为空</div>'}
            </div>
        `;

        this.bindDirectoryStaticActions();
        this.bindDirectoryRows();
        this.observeChapterCovers();
    }

    renderDirectoryRow(node) {
        return `
            <button class="directory-row" data-path="${escapeHtml(node.path)}">
                <span class="folder-mark">⌁</span>
                <span>${escapeHtml(node.name)}</span>
                <span class="row-chevron">›</span>
            </button>
        `;
    }

    renderChapterCard(node, progress) {
        const displayName = getChapterDisplayName(node.chapter);
        const pathLabel = getParentPath(node.path_id) || store.series.current;
        return `
            <button class="chapter-card" data-index="${node.flatIndex}">
                <span class="chapter-cover skeleton" data-cover-index="${node.flatIndex}"></span>
                <span class="chapter-card-body">
                    <strong>${escapeHtml(displayName)}</strong>
                    <span data-progress-index="${node.flatIndex}">${escapeHtml(formatChapterProgress(progress, 0))}</span>
                    <small>${escapeHtml(pathLabel)}</small>
                </span>
            </button>
        `;
    }

    bindDirectoryStaticActions() {
        this.elements.directoryView.querySelectorAll('[data-action="series"]').forEach(btn => {
            btn.addEventListener('click', () => this.showView('seriesList'));
        });
        this.elements.directoryView.querySelectorAll('[data-action="back"]').forEach(btn => {
            btn.addEventListener('click', () => this.goDirectoryBack());
        });
    }

    bindDirectoryRows() {
        this.elements.directoryView.querySelectorAll('.directory-row').forEach(rowEl => {
            rowEl.addEventListener('click', () => this.renderDirectory(rowEl.dataset.path));
        });
        this.elements.directoryView.querySelectorAll('.chapter-card').forEach(cardEl => {
            cardEl.addEventListener('click', () => this.openChapter(Number(cardEl.dataset.index), true));
        });
    }

    goDirectoryBack() {
        if (!store.navigation.currentPath) {
            this.showView('seriesList');
            return;
        }
        this.renderDirectory(getParentPath(store.navigation.currentPath));
    }

    observeChapterCovers() {
        if (this.coverObserver) {
            this.coverObserver.disconnect();
        }

        const coverEls = this.elements.directoryView.querySelectorAll('[data-cover-index]');
        if (!('IntersectionObserver' in window)) {
            coverEls.forEach(coverEl => this.loadChapterCover(coverEl));
            return;
        }

        this.coverObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                this.coverObserver.unobserve(entry.target);
                this.loadChapterCover(entry.target);
            });
        }, {
            root: null,
            rootMargin: '260px 0px',
            threshold: 0.01,
        });

        coverEls.forEach(coverEl => this.coverObserver.observe(coverEl));
    }

    async loadChapterCover(coverEl) {
        if (['loading', 'loaded'].includes(coverEl.dataset.coverState)) return;

        markCoverLoading(coverEl);
        const index = Number(coverEl.dataset.coverIndex);
        const node = this.findChapterNodeByIndex(index);
        const progressEl = this.elements.directoryView.querySelector(`[data-progress-index="${index}"]`);
        if (!node || !progressEl) return;

        const meta = await this.getChapterMeta(index);
        markCoverLoaded(coverEl);
        coverEl.classList.remove('skeleton');
        const progress = storage.getProgress(store.series.current, index);
        progressEl.textContent = formatChapterProgress(progress, meta.totalPages);

        if (meta.coverUrl) {
            coverEl.innerHTML = `<img src="${meta.coverUrl}" alt="${escapeHtml(node.name)} 首图" loading="lazy" data-source="${meta.coverSource}">`;
        } else {
            coverEl.classList.add('chapter-cover-placeholder');
            coverEl.textContent = '无预览';
        }
    }

    findChapterNodeByIndex(index) {
        const nodes = getLevelNodes(store.chapters.tree, store.navigation.currentPath);
        return nodes.find(node => node.type === 'chapter' && node.flatIndex === index);
    }

    async getChapterMeta(index) {
        if (this.chapterMetaCache.has(index)) return this.chapterMetaCache.get(index);
        const chapter = store.chapters.flatList[index];
        const fallback = { totalPages: 0, files: [], coverUrl: '' };
        if (!chapter) return fallback;

        try {
            const data = await api.getChapterFiles(store.series.current, chapter.path_id);
            const files = data.files || [];
            const firstImage = files.find(file => isImageFile(file));
            const cover = firstImage
                ? await api.resolveImageUrl(store.series.current, firstImage, chapter.path_id)
                : { url: '', source: '' };
            const meta = { totalPages: files.length, files, coverUrl: cover.url, coverSource: cover.source };
            this.chapterMetaCache.set(index, meta);
            return meta;
        } catch (error) {
            console.warn('加载章节卡片元数据失败:', chapter.path_id, error);
            this.chapterMetaCache.set(index, fallback);
            return fallback;
        }
    }

    async openChapter(index, isUiSelection = false) {
        if (store.reader.isLoading || index < 0 || index >= store.chapters.flatList.length) return;
        store.setCurrentChapterIndex(index);
        const chapter = store.chapters.flatList[index];
        store.navigation.returnPath = getParentPath(chapter.path_id);
        store.currentChapter = chapter;
        this.showView('reader');
        this.elements.readerActions.classList.add('hidden');
        this.resetReaderUi();

        try {
            store.setReaderLoading(true);
            const meta = await this.getChapterMeta(index);
            const files = meta.files.length > 0
                ? meta.files
                : (await api.getChapterFiles(store.series.current, chapter.path_id)).files || [];
            store.setReaderFiles(files);
            await this.reader.loadChapter(files, chapter, store.series.current);
            this.updateProgressStatus();
            storage.setCurrentSeries(store.series.current);
            storage.setCurrentChapterPath(chapter.path_id);
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
        await this.getChapterMeta(index);
    }

    resetReaderUi() {
        this.elements.reader.innerHTML = '';
        this.elements.progressStatus.textContent = '0 / 0';
        this.elements.readerMenuBtn.classList.remove('hidden');
        this.elements.restoreFabBtn.classList.add('hidden');
        this.elements.prevBtn.disabled = store.chapters.currentIndex <= 0;
        this.elements.nextBtn.disabled = store.chapters.currentIndex >= store.chapters.flatList.length - 1;
    }

    updateProgressStatus() {
        progressState.setLoadedPages(store.lazyLoad.loadedCount);
        this.elements.progressStatus.textContent = progressState.getBriefText();
        this.elements.progressStatus.title = `点击跳转页码 (或按 G 键)
当前: ${progressState.getDisplayText()}`;
        this.elements.prevBtn.disabled = store.chapters.currentIndex <= 0;
        this.elements.nextBtn.disabled = store.chapters.currentIndex >= store.chapters.flatList.length - 1;
    }

    openPrevChapter() {
        if (store.chapters.currentIndex > 0) this.openChapter(store.chapters.currentIndex - 1);
    }

    openNextChapter() {
        if (store.chapters.currentIndex < store.chapters.flatList.length - 1) this.openChapter(store.chapters.currentIndex + 1);
    }

    backToDirectory() {
        this.renderDirectory(store.navigation.returnPath || '');
    }

    toggleReaderActions() {
        this.elements.readerActions.classList.toggle('hidden');
    }

    hideFab() {
        this.elements.readerActions.classList.add('hidden');
        this.elements.readerMenuBtn.classList.add('hidden');
        this.elements.restoreFabBtn.classList.remove('hidden');
    }

    showFab() {
        this.elements.readerMenuBtn.classList.remove('hidden');
        this.elements.restoreFabBtn.classList.add('hidden');
    }

    showJumpModal() {
        if (store.reader.files.length === 0) return;
        this.elements.totalPages.textContent = store.reader.files.length;
        this.elements.jumpPageInput.value = '';
        this.elements.jumpPageInput.max = store.reader.files.length;
        this.elements.jumpModal.classList.remove('hidden');
        this.elements.jumpModal.classList.add('flex');
        setTimeout(() => this.elements.jumpPageInput.focus(), 100);
    }

    hideJumpModal() {
        this.elements.jumpModal.classList.add('hidden');
        this.elements.jumpModal.classList.remove('flex');
    }

    jumpToPage() {
        const pageNum = parseInt(this.elements.jumpPageInput.value, 10);
        if (Number.isNaN(pageNum) || pageNum < 1 || pageNum > store.reader.files.length) {
            this.showInputError('请输入有效的页码');
            return;
        }
        this.hideJumpModal();
        this.reader.jumpToPage(pageNum);
    }

    showInputError(message) {
        this.elements.jumpPageInput.classList.add('border-red-500', 'ring-2', 'ring-red-200');
        this.elements.jumpPageInput.title = message;
        setTimeout(() => {
            this.elements.jumpPageInput.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
            this.elements.jumpPageInput.title = '';
        }, 500);
    }

    showView(view) {
        store.currentView = view;
        this.elements.seriesView.classList.toggle('hidden', view !== 'seriesList');
        this.elements.directoryView.classList.toggle('hidden', view !== 'directoryBrowser');
        this.elements.readerView.classList.toggle('hidden', view !== 'reader');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
