// 目录页面视图模块

import { store } from '../state/store.js';
import { storage } from '../services/storage.js';
import { $, escapeHtml } from '../utils/dom.js';
import {
    getParentPath,
    formatChapterProgress,
    getChapterDisplayName,
    splitChapterPath,
} from '../utils/chapter-tree.js';
import { markCoverLoading, markCoverLoaded, markCoverIdle, unloadCoverImage } from '../utils/lazy-cover.js';
import { RequestQueue } from '../utils/request-queue.js';
import { LAZY_LOAD_CONFIG } from '../config/constants.js';
import { api } from '../services/api.js';

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
        this.currentLevelNodes = [];
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

    renderDirectoryLoading(seriesName, path) {
        const title = path ? splitChapterPath(path).at(-1) : seriesName;
        const backText = path ? `‹ ${getParentPath(path) || seriesName}` : '‹ 系列';

        this.container.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="back">${escapeHtml(backText)}</button>
            </div>
            <div class="mobile-page-header compact">
                <p class="mobile-kicker">${escapeHtml(seriesName || '')}</p>
                <h1>${escapeHtml(title || '目录')}</h1>
                <p>正在加载目录...</p>
            </div>
        `;
        this.bindStaticActions();
    }

    async renderDirectory(path) {
        store.setNavigation(path);

        // 检查缓存
        const cached = store.getLevelCache(path);
        if (cached) {
            this.currentLevelNodes = cached;
            this.renderLevelNodes(path, cached);
            return;
        }

        // 显示加载状态
        this.renderDirectoryLoading(store.series.current, path);

        // 按需请求
        try {
            const levelData = await api.getLevelNodes(store.series.current, path);
            store.setLevelCache(path, levelData.nodes);
            this.currentLevelNodes = levelData.nodes;
            this.renderLevelNodes(path, levelData.nodes);
        } catch (error) {
            console.error('加载目录失败:', error);
            this.renderDirectoryError(path, error);
        }
    }

    renderDirectoryError(path, error) {
        const title = path ? splitChapterPath(path).at(-1) : store.series.current;
        const backText = path ? `‹ ${getParentPath(path) || store.series.current}` : '‹ 系列';

        this.container.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="back">${escapeHtml(backText)}</button>
            </div>
            <div class="mobile-page-header compact">
                <p class="mobile-kicker">${escapeHtml(store.series.current || '')}</p>
                <h1>${escapeHtml(title || '目录')}</h1>
            </div>
            <div class="mobile-state-card error-state">
                <strong>加载失败</strong>
                <span>无法加载目录内容。</span>
                <button id="retryDirectoryBtn" class="primary-btn">重试</button>
            </div>
        `;
        this.bindStaticActions();
        const retryBtn = $('#retryDirectoryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.renderDirectory(path));
        }
    }

    renderLevelNodes(path, nodes) {
        const title = path ? splitChapterPath(path).at(-1) : store.series.current;
        const backText = path ? `‹ ${getParentPath(path) || store.series.current}` : '‹ 系列';
        const progress = storage.getSeriesProgress(store.series.current);

        const items = nodes.map(node =>
            node.type === 'directory'
                ? this.renderDirectoryRow(node)
                : this.renderChapterCardV2(node, progress[node.path_id])
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

    renderChapterCardV2(node, progress) {
        const displayName = getChapterDisplayName(node);
        const pathLabel = getParentPath(node.path_id) || store.series.current;
        return `
            <button class="chapter-card-v2" data-path-id="${escapeHtml(node.path_id)}">
                <span class="chapter-cover skeleton" data-cover-path="${escapeHtml(node.path_id)}"></span>
                <span class="chapter-card-body">
                    <strong>${escapeHtml(displayName)}</strong>
                    <span data-progress-path="${escapeHtml(node.path_id)}">${escapeHtml(formatChapterProgress(progress, node.total_files || 0))}</span>
                    <small>${escapeHtml(pathLabel)}</small>
                </span>
            </button>
        `;
    }

    bindRows() {
        this.container.querySelectorAll('.directory-row').forEach(rowEl => {
            rowEl.addEventListener('click', () => this.onRenderDirectory(rowEl.dataset.path));
        });
        this.container.querySelectorAll('.chapter-card-v2').forEach(cardEl => {
            cardEl.addEventListener('click', () => this.onOpenChapter(cardEl.dataset.pathId, true));
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
        const coverEls = this.container.querySelectorAll('[data-cover-path]');
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
        const pathId = coverEl.dataset.coverPath;
        const node = this.findChapterNodeByPathId(pathId);
        const progressEl = this.container.querySelector(`[data-progress-path="${CSS.escape(pathId)}"]`);
        if (!node || !progressEl) return;

        const meta = await this.chapterMetaCache.getOrFetchByPathId(pathId);
        if (coverLoadToken !== this.coverLoadToken || !coverEl.isConnected) return;
        if (coverEl.dataset.coverVisible !== 'true') {
            markCoverIdle(coverEl);
            return;
        }
        markCoverLoaded(coverEl);
        coverEl.classList.remove('skeleton');
        const progress = storage.getProgress(store.series.current, pathId);
        progressEl.textContent = formatChapterProgress(progress, meta.totalPages);

        if (meta.coverUrl) {
            coverEl.innerHTML = `<img src="${meta.coverUrl}" alt="${escapeHtml(node.name)} 首图" loading="lazy" data-source="${meta.coverSource}">`;
        } else {
            coverEl.classList.add('chapter-cover-placeholder');
            coverEl.textContent = '无预览';
        }
    }

    findChapterNodeByPathId(pathId) {
        return this.currentLevelNodes.find(node => node.type === 'chapter' && node.path_id === pathId);
    }

    show() {
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
    }
}