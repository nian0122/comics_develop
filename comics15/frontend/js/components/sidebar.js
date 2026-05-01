// 侧边栏组件

import { store } from '../state/store.js';
import { storage } from '../services/storage.js';
import { $, escapeHtml } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';

export class Sidebar {
    constructor() {
        this.container = $('#sidebar');
        this.seriesList = $('#seriesList');
        this.chaptersList = $('#chapters');
        this.filterInput = $('#filter');
        this.toggleBtn = $('#toggleSidebarBtn');
        this.menuIcon = $('#menuIcon');
        this.closeIcon = $('#closeIcon');
        this.overlay = $('#sidebarOverlay');

        this.init();
    }

    init() {
        this.bindEvents();
        this.hide();
    }

    bindEvents() {
        this.toggleBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggle();
        };

        this.overlay.onclick = () => {
            this.hide();
        };

        document.addEventListener('click', (e) => {
            if (!this.container.classList.contains('hidden')) {
                if (!this.container.contains(e.target) && !this.toggleBtn.contains(e.target)) {
                    this.hide();
                }
            }
        });

        this.filterInput.addEventListener('input', debounce(() => {
            this.filterChapters(this.filterInput.value);
        }, 200));
    }

    toggle() {
        const isHidden = this.container.classList.contains('hidden');
        if (isHidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        this.container.classList.remove('hidden');
        this.menuIcon.classList.add('hidden');
        this.closeIcon.classList.remove('hidden');
        this.overlay.classList.remove('hidden');
        store.setSidebarVisible(true);
    }

    hide() {
        this.container.classList.add('hidden');
        this.menuIcon.classList.remove('hidden');
        this.closeIcon.classList.add('hidden');
        this.overlay.classList.add('hidden');
        store.setSidebarVisible(false);
    }

    renderSeriesList(series, selectedSeries) {
        if (series.length === 0) {
            this.seriesList.innerHTML = '<div class="status-text" style="text-align: center;">未找到漫画系列</div>';
            return;
        }

        this.seriesList.innerHTML = '';

        series.forEach(s => {
            const div = document.createElement('div');
            div.className = `list-item series-item ${s === selectedSeries ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="chapter-dot"></div>
                <span>${escapeHtml(s)}</span>
            `;
            div.onclick = () => {
                window.dispatchEvent(new CustomEvent('series:select', {
                    detail: { name: s }
                }));
            };
            this.seriesList.appendChild(div);
        });
    }

    renderChapters(tree, filterText = '', currentIndex = -1) {
        this.chaptersList.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();

        if (tree.length === 0) {
            this.chaptersList.innerHTML = '<div class="status-text" style="text-align: center;">暂无章节</div>';
            return;
        }

        let selectedChapterDiv = null;

        const containsFilteredChapters = (node, filter) => {
            if (node.isChapter) {
                return node.name.toLowerCase().includes(filter);
            }
            if (node.children && node.children.length > 0) {
                return node.children.some(child => containsFilteredChapters(child, filter));
            }
            return false;
        };

        const renderNode = (node, depth = 0) => {
            if (lowerFilter && !containsFilteredChapters(node, lowerFilter)) {
                return;
            }

            if (!node.isChapter) {
                const isExpanded = node.isExpanded || lowerFilter;
                const titleDiv = document.createElement('div');
                titleDiv.className = `volume-title ${isExpanded ? '' : 'collapsed'}`;
                titleDiv.style.paddingLeft = `${10 + depth * 15}px`;
                titleDiv.innerHTML = `
                    <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                    ${escapeHtml(node.name)}
                `;
                titleDiv.onclick = (e) => {
                    e.stopPropagation();
                    if (!lowerFilter) {
                        node.isExpanded = !node.isExpanded;
                        storage.setExpandedPath(node.fullPath, node.isExpanded);
                        this.renderChapters(store.chapters.tree, this.filterInput.value, currentIndex);
                    }
                };
                this.chaptersList.appendChild(titleDiv);

                if (isExpanded) {
                    node.children.forEach(child => renderNode(child, depth + 1));
                }
            } else if (node.isChapter) {
                if (lowerFilter && !node.name.toLowerCase().includes(lowerFilter)) {
                    return;
                }

                const isSelected = node.flatIndex === currentIndex;

                const div = document.createElement('div');
                div.className = `list-item chapter-item ${isSelected ? 'selected' : ''}`;
                div.style.paddingLeft = `${20 + depth * 15}px`;

                if (node.flatIndex !== null) {
                    div.onclick = () => {
                        window.dispatchEvent(new CustomEvent('chapter:select', {
                            detail: { index: node.flatIndex }
                        }));
                    };
                }

                const dot = document.createElement('div');
                dot.className = 'chapter-dot';

                const textSpan = document.createElement('span');
                textSpan.textContent = node.name;

                div.appendChild(dot);
                div.appendChild(textSpan);

                this.chaptersList.appendChild(div);

                if (isSelected) {
                    selectedChapterDiv = div;
                }
            }
        };

        tree.forEach(node => renderNode(node));

        if (selectedChapterDiv) {
            setTimeout(() => {
                selectedChapterDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }

    filterChapters(filterText) {
        if (!store.series.current || store.chapters.tree.length === 0) return;
        this.renderChapters(store.chapters.tree, filterText, store.chapters.currentIndex);
    }

    showLoading() {
        this.seriesList.innerHTML = '<div class="p-3 text-center" style="color: rgba(92, 85, 71, 0.7);">正在加载...</div>';
    }

    showError(message) {
        this.seriesList.innerHTML = `<div class="p-2 text-red-400">${escapeHtml(message)}</div>`;
    }
}