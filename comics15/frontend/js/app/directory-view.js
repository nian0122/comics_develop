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
import { getCoverLoadPolicy } from '../utils/cover-load-policy.js';

export class DirectoryView {
    constructor(container, chapterMetaCache, callbacks = {}) {
        this.container = container;
        this.chapterMetaCache = chapterMetaCache;
        this.coverObserver = null;
        this.coverLoadPolicy = callbacks.coverLoadPolicy || getCoverLoadPolicy();
        this.coverLoadQueue = new RequestQueue(this.coverLoadPolicy.maxConcurrent);
        this.coverLoadToken = 0;
        this.coverUnloadTimers = new Map();
        this.activeCoverIndexes = [];
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
                ${this.renderCoverPlaceholder(node.flatIndex)}
                <span class="chapter-card-body">
                    <strong>${escapeHtml(displayName)}</strong>
                    <span data-progress-index="${node.flatIndex}">${escapeHtml(formatChapterProgress(progress, 0))}</span>
                    <small>${escapeHtml(pathLabel)}</small>
                </span>
            </button>
        `;
    }

    renderCoverPlaceholder(index) {
        if (this.coverLoadPolicy.autoLoadCovers !== false) {
            return `<span class="chapter-cover skeleton" data-cover-index="${index}"></span>`;
        }

        return `<span class="chapter-cover chapter-cover-manual" data-cover-index="${index}" data-cover-action="load">点击加载封面</span>`;
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
            cardEl.addEventListener('click', (event) => {
                const coverEl = event.target.closest('[data-cover-action="load"]');
                if (coverEl) {
                    event.preventDefault();
                    event.stopPropagation();
                    coverEl.dataset.coverVisible = 'true';
                    this.enqueueCoverLoad(coverEl);
                    return;
                }
                this.onOpenChapter(Number(cardEl.dataset.index), true);
            });
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
                    this.scheduleCoverUnload(entry.target);
                    return;
                }
                this.cancelCoverUnload(entry.target);
                if (this.coverLoadPolicy.autoLoadCovers !== false) {
                    this.enqueueCoverLoad(entry.target, coverLoadToken);
                }
            });
        }, {
            root: null,
            rootMargin: this.coverLoadPolicy.rootMargin,
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

    scheduleCoverUnload(coverEl) {
        this.cancelCoverUnload(coverEl);
        const index = Number(coverEl.dataset.coverIndex);
        const unload = () => {
            this.coverUnloadTimers.delete(index);
            unloadCoverImage(coverEl);
            this.activeCoverIndexes = this.activeCoverIndexes.filter(activeIndex => activeIndex !== index);
        };

        if (this.coverLoadPolicy.unloadDelayMs > 0) {
            this.coverUnloadTimers.set(index, window.setTimeout(unload, this.coverLoadPolicy.unloadDelayMs));
            return;
        }

        unload();
    }

    cancelCoverUnload(coverEl) {
        const index = Number(coverEl.dataset.coverIndex);
        const timerId = this.coverUnloadTimers.get(index);
        if (!timerId) return;

        window.clearTimeout(timerId);
        this.coverUnloadTimers.delete(index);
    }

    rememberActiveCover(coverEl) {
        const index = Number(coverEl.dataset.coverIndex);
        this.activeCoverIndexes = this.activeCoverIndexes.filter(activeIndex => activeIndex !== index);
        this.activeCoverIndexes.push(index);

        while (this.activeCoverIndexes.length > this.coverLoadPolicy.maxActiveCovers) {
            const staleIndex = this.activeCoverIndexes.shift();
            const staleCoverEl = this.container.querySelector(`[data-cover-index="${staleIndex}"]`);
            if (staleCoverEl) {
                this.cancelCoverUnload(staleCoverEl);
                unloadCoverImage(staleCoverEl);
            }
        }
    }

    cleanupChapterCovers() {
        if (this.coverObserver) {
            this.coverObserver.disconnect();
            this.coverObserver = null;
        }

        this.coverLoadQueue.clear();
        this.coverLoadToken += 1;
        this.coverUnloadTimers.forEach(timerId => window.clearTimeout(timerId));
        this.coverUnloadTimers.clear();
        this.activeCoverIndexes = [];
        this.container.querySelectorAll('[data-cover-index]').forEach(coverEl => unloadCoverImage(coverEl));
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
        if (meta.coverUrl && coverEl.querySelector('img')) {
            unloadCoverImage(coverEl);
        }

        markCoverLoaded(coverEl);
        coverEl.classList.remove('skeleton');
        const progress = storage.getProgress(store.series.current, index);
        progressEl.textContent = formatChapterProgress(progress, meta.totalPages);

        if (meta.coverUrl) {
            delete coverEl.dataset.coverAction;
            coverEl.classList.remove('chapter-cover-manual');
            coverEl.innerHTML = `<img src="${meta.coverUrl}" alt="${escapeHtml(node.name)} 首图" loading="lazy" data-source="${meta.coverSource}">`;
            this.rememberActiveCover(coverEl);
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