// 系列页面视图模块

import { $, escapeHtml } from '../utils/dom.js';
import { storage } from '../services/storage.js';

export class SeriesView {
    constructor(container, callbacks = {}) {
        this.container = container;
        this.onSelectSeries = callbacks.onSelectSeries || (() => {});
        this.onRetry = callbacks.onRetry || (() => {});
    }

    renderLoading() {
        this.container.innerHTML = `
            <div class="mobile-page-header">
                <p class="mobile-kicker">Library</p>
                <h1>漫画阅读器</h1>
            </div>
            <div class="mobile-state-card">正在加载系列...</div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
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
        const retryBtn = $('#retrySeriesBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.onRetry());
        }
    }

    renderList(series) {
        const items = series.map(name => {
            const lastReading = storage.getSeriesLastReading(name);
            const hint = lastReading && lastReading.page > 0
                ? `<span class="series-reading-hint">读到第 ${lastReading.page}/${lastReading.totalPages} 页</span>`
                : '';
            return `
                <button class="series-row" data-series="${escapeHtml(name)}">
                    <span class="series-name">${escapeHtml(name)}</span>
                    ${hint}
                    <span class="row-chevron">›</span>
                </button>
            `;
        }).join('');

        this.container.innerHTML = `
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

        this.bindListEvents();
    }

    bindListEvents() {
        const seriesListEl = $('#seriesList');
        const searchEl = $('#seriesSearch');

        if (seriesListEl) {
            seriesListEl.addEventListener('click', (event) => {
                const rowEl = event.target.closest('.series-row');
                if (!rowEl) return;
                this.onSelectSeries(rowEl.dataset.series);
            });
        }

        if (searchEl) {
            searchEl.addEventListener('input', () => this.filterSeries(searchEl.value));
        }
    }

    filterSeries(keyword) {
        const value = keyword.trim().toLowerCase();
        const rows = this.container.querySelectorAll('.series-row');
        rows.forEach(rowEl => {
            rowEl.hidden = value && !rowEl.dataset.series.toLowerCase().includes(value);
        });
    }

    show() {
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
    }
}