// 目录页面视图模块

import { store } from '../state/store.js';
import { storage } from '../services/storage.js';
import { $, escapeHtml } from '../utils/dom.js';
import {
    getLevelNodes,
    getParentPath,
    formatChapterProgress,
    getChapterDisplayName,
    splitChapterPath,
} from '../utils/chapter-tree.js';
import { markCoverLoading, markCoverLoaded, markCoverIdle, unloadCoverImage } from '../utils/lazy-cover.js';
import { RequestQueue } from '../utils/request-queue.js';
import { LAZY_LOAD_CONFIG } from '../config/constants.js';

export class DirectoryView {
    constructor(container, chapterMetaCache, callbacks = {}) {
        this.container = container;
        this.chapterMetaCache = chapterMetaCache;
        this.coverObserver = null;
        this.coverLoadQueue = new RequestQueue(LAZY_LOAD_CONFIG.COVER_MAX_CONCURRENT);
        this.coverLoadToken = 0;
        this.onShowSeries = callbacks.onShowSeries || (() => {});
        this.onOpenChapter = callbacks.onOpenChapter || (() => {});
        this.onRenderDirectory = callbacks.onRenderDirectory || (() => {});
        this.onRetrySeries = callbacks.onRetrySeries || (() => {});
    }

    renderLoading(seriesName) {
        this.container.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="series">‹ 系列</button>
            </div>
            <div class="mobile-page-header compact">
                <h1>${escapeHtml(seriesName)}</h1>
                <p>正在加载目录...</p>
            </div>
        `;
        this.bindStaticActions();
    }

    renderError(seriesName) {
        this.container.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="series">‹ 系列</button>
            </div>
            <div class="mobile-state-card error-state">
                <strong>加载失败</strong>
                <span>无法加载 ${escapeHtml(seriesName)} 的章节目录。</span>
                <button id="retryDirectoryBtn" class="primary-btn">重试</button>
            </div>
        `;
        this.bindStaticActions();
        const retryBtn = $('#retryDirectoryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.onRetrySeries(seriesName));
        }
    }

    renderDirectory(path) {
        store.setNavigation(path);
        const nodes = getLevelNodes(store.chapters.tree, path);
        const title = path ? splitChapterPath(path).at(-1) : store.series.current;
        const backText = path ? `‹ ${getParentPath(path) || store.series.current}` : '‹ 系列';
        const progress = storage.getSeriesProgress(store.series.current);
        const items = nodes.map(node => node.type === 'directory'
            ? this.renderDirectoryRow(node)
            : this.renderChapterCard(node, progress[node.flatIndex])
        ).join('');

        this.container.innerHTML = `
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

        this.bindStaticActions();
        this.bindRows();
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

    bindStaticActions() {
        this.container.querySelectorAll('[data-action="series"]').forEach(btn => {
            btn.addEventListener('click', () => this.onShowSeries());
        });
        this.container.querySelectorAll('[data-action="back"]').forEach(btn => {
            btn.addEventListener('click', () => this.goBack());
        });
    }

    bindRows() {
        this.container.querySelectorAll('.directory-row').forEach(rowEl => {
            rowEl.addEventListener('click', () => this.onRenderDirectory(rowEl.dataset.path));
        });
        this.container.querySelectorAll('.chapter-card').forEach(cardEl => {
            cardEl.addEventListener('click', () => this.onOpenChapter(Number(cardEl.dataset.index), true));
        });
    }

    goBack() {
        if (!store.navigation.currentPath) {
            this.onShowSeries();
            return;
        }
        this.onRenderDirectory(getParentPath(store.navigation.currentPath));
    }

    observeChapterCovers() {
        if (this.coverObserver) {
            this.coverObserver.disconnect();
        }

        this.coverLoadQueue.clear();
        this.coverLoadToken += 1;
        const coverLoadToken = this.coverLoadToken;
        const coverEls = this.container.querySelectorAll('[data-cover-index]');
        if (!('IntersectionObserver' in window)) {
            coverEls.forEach(coverEl => {
                coverEl.dataset.coverVisible = 'true';
                this.enqueueCoverLoad(coverEl, coverLoadToken);
            });
            return;
        }

        this.coverObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                entry.target.dataset.coverVisible = entry.isIntersecting ? 'true' : 'false';
                if (!entry.isIntersecting) {
                    unloadCoverImage(entry.target);
                    return;
                }
                this.enqueueCoverLoad(entry.target, coverLoadToken);
            });
        }, {
            root: null,
            rootMargin: LAZY_LOAD_CONFIG.COVER_ROOT_MARGIN,
            threshold: 0.01,
        });

        coverEls.forEach(coverEl => this.coverObserver.observe(coverEl));
    }

    enqueueCoverLoad(coverEl, coverLoadToken = this.coverLoadToken) {
        if (['loading', 'loaded'].includes(coverEl.dataset.coverState)) return;
        this.coverLoadQueue.add(() => {
            if (coverLoadToken !== this.coverLoadToken || !coverEl.isConnected) return undefined;
            return this.loadCover(coverEl, coverLoadToken);
        });
    }

    async loadCover(coverEl, coverLoadToken = this.coverLoadToken) {
        if (coverLoadToken !== this.coverLoadToken || !coverEl.isConnected) return;
        if (['loading', 'loaded'].includes(coverEl.dataset.coverState)) return;

        markCoverLoading(coverEl);
        const index = Number(coverEl.dataset.coverIndex);
        const node = this.findChapterNodeByIndex(index);
        const progressEl = this.container.querySelector(`[data-progress-index="${index}"]`);
        if (!node || !progressEl) return;

        const meta = await this.chapterMetaCache.getOrFetch(index);
        if (coverLoadToken !== this.coverLoadToken || !coverEl.isConnected) return;
        if (coverEl.dataset.coverVisible !== 'true') {
            markCoverIdle(coverEl);
            return;
        }
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

    show() {
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
    }
}