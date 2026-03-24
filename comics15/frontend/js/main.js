// 应用主入口

import { store, progressState } from './state/index.js';
import { api, storage } from './services/index.js';
import { Sidebar, Reader } from './components/index.js';
import { $ } from './utils/dom.js';
import { naturalSort } from './utils/natural-sort.js';

class App {
    constructor() {
        this.sidebar = null;
        this.reader = null;

        this.elements = {
            status: $('#status'),
            prevBtn: $('#prevBtn'),
            nextBtn: $('#nextBtn'),
            scrollTopBtn: $('#scrollTop'),
            scaleRange: $('#scaleRange'),
            scaleLabel: $('#scaleLabel'),
            progressStatus: $('#progressStatus'),
            emptyDiv: $('#empty'),
            header: document.querySelector('.header'),
            footer: document.querySelector('.footer'),

            jumpModal: $('#jumpModal'),
            jumpPageInput: $('#jumpPageInput'),
            jumpCancelBtn: $('#jumpCancelBtn'),
            jumpConfirmBtn: $('#jumpConfirmBtn'),
            totalPages: $('#totalPages'),
            retryFailedBtn: $('#retryFailedBtn'),
        };
    }

    async init() {
        this.sidebar = new Sidebar();
        this.reader = new Reader();

        this.bindEvents();
        this.showHeaderFooter();

        await this.restoreReadingPosition();
    }

    bindEvents() {
        this.elements.prevBtn.onclick = () => this.openPrevChapter();
        this.elements.nextBtn.onclick = () => this.openNextChapter();
        this.elements.scrollTopBtn.onclick = () => this.reader.scrollToTop();

        this.elements.scaleRange.addEventListener('input', () => {
            const scale = this.elements.scaleRange.value;
            this.elements.scaleLabel.textContent = scale + '%';
            this.reader.setScale(scale);
        });

        this.elements.progressStatus.onclick = () => this.showJumpModal();
        this.elements.jumpCancelBtn.onclick = () => this.hideJumpModal();
        this.elements.jumpConfirmBtn.onclick = () => this.jumpToPage();

        this.elements.jumpPageInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.jumpToPage();
            }
            if (e.key === 'Escape') {
                this.hideJumpModal();
            }
        };

        this.elements.jumpModal.onclick = (e) => {
            if (e.target === this.elements.jumpModal) {
                this.hideJumpModal();
            }
        };

        this.elements.retryFailedBtn.onclick = () => this.retryAllFailedImages();

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        window.addEventListener('chapter:select', (e) => {
            this.openChapter(e.detail.index, true);
        });

        window.addEventListener('series:select', (e) => {
            this.selectSeries(e.detail.name);
        });

        window.addEventListener('status:update', (e) => {
            this.setStatus(e.detail.message);
        });

        window.addEventListener('reader:imageLoaded', () => {
            this.updateProgressStatus();
        });
    }

    handleKeyboard(e) {
        if (document.activeElement.tagName === 'INPUT') return;

        if (e.key === 'ArrowLeft') {
            this.elements.prevBtn.click();
            e.preventDefault();
        }
        if (e.key === 'ArrowRight') {
            this.elements.nextBtn.click();
            e.preventDefault();
        }
        if (e.key === 'Home') {
            this.elements.scrollTopBtn.click();
            e.preventDefault();
        }
        if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.showJumpModal();
            e.preventDefault();
        }
        if (e.key === 'PageDown') {
            this.reader.container.scrollBy({ top: this.reader.container.clientHeight * 0.9, behavior: 'smooth' });
            e.preventDefault();
        }
        if (e.key === 'PageUp') {
            this.reader.container.scrollBy({ top: this.reader.container.clientHeight * -0.9, behavior: 'smooth' });
            e.preventDefault();
        }
    }

    setStatus(message) {
        this.elements.status.textContent = '状态：' + message;
    }

    showHeaderFooter() {
        this.elements.header?.classList.remove('hidden');
        this.elements.footer?.classList.remove('hidden');
    }

    async loadSeries() {
        try {
            this.sidebar.showLoading();
            const series = await api.getSeries();

            store.setSeries(series);
            this.sidebar.renderSeriesList(series, store.series.current);

            this.setStatus(`已加载系列：${series.length}`);
        } catch (error) {
            this.sidebar.showError('错误：无法连接到后端或加载系列列表。');
            this.setStatus('错误：无法加载系列列表');
            console.error('Error loading series:', error);
        }
    }

    async selectSeries(name) {
        if (store.series.current === name) return;

        store.setCurrentSeries(name);

        await this.fetchAndRenderChapters(name);

        this.sidebar.renderSeriesList(store.series.list, name);
        storage.setCurrentSeries(name);
    }

    async fetchAndRenderChapters(name) {
        this.setStatus('加载章节...');
        this.sidebar.chaptersList.innerHTML = '<div class="status-text" style="text-align: center;">正在加载章节...</div>';

        try {
            const flatChapters = await api.getChapters(name);

            store.chapters.flatList = flatChapters;
            const tree = this.buildChapterTree(flatChapters);
            store.chapters.tree = tree;

            this.sidebar.renderChapters(tree, '', -1);

            this.reader.container.innerHTML = '';
            this.elements.emptyDiv.style.display = 'flex';
            this.resetLoadingState();

        } catch (error) {
            this.sidebar.chaptersList.innerHTML = '<div class="p-2 text-red-400">错误：无法加载章节数据。</div>';
            this.setStatus('错误：无法加载章节数据');
            console.error('Error loading chapters:', error);
        }
    }

    buildChapterTree(flatChapters) {
        const root = { name: 'root', children: {} };
        const expandedPaths = storage.getExpandedPaths();

        flatChapters.forEach((chapter, index) => {
            const parts = chapter.path_id.split(/[\\/]/).filter(p => p);
            let current = root;
            let fullPath = '';

            parts.forEach((part, i) => {
                fullPath = fullPath ? `${fullPath}/${part}` : part;

                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        fullPath: fullPath,
                        children: {},
                        isChapter: (i === parts.length - 1),
                        flatIndex: (i === parts.length - 1) ? index : null,
                        path_id: (i === parts.length - 1) ? chapter.path_id : null,
                        isExpanded: expandedPaths[fullPath] !== false,
                    };
                }
                current = current.children[part];
            });
        });

        const sortChildren = (node) => {
            const childrenArray = Object.values(node.children);

            childrenArray.sort((a, b) => {
                const naturalKeysA = naturalSort(a.name);
                const naturalKeysB = naturalSort(b.name);

                for (let i = 0; i < Math.min(naturalKeysA.length, naturalKeysB.length); i++) {
                    if (naturalKeysA[i] < naturalKeysB[i]) return -1;
                    if (naturalKeysA[i] > naturalKeysB[i]) return 1;
                }
                return naturalKeysA.length - naturalKeysB.length;
            });

            childrenArray.forEach(sortChildren);
            node.children = childrenArray;
        };

        sortChildren(root);
        return root.children;
    }

    async openChapter(idx, isUiSelection = false) {
        if (store.reader.isLoading || idx < 0 || idx >= store.chapters.flatList.length) return;

        store.setCurrentChapterIndex(idx);
        const chapterData = store.chapters.flatList[idx];

        this.setStatus('加载文件元数据...');

        this.sidebar.renderChapters(store.chapters.tree, '', idx);

        this.resetLoadingState();
        this.reader.container.innerHTML = '';
        this.elements.emptyDiv.style.display = 'none';

        if (idx === store.preload.nextChapterIndex && store.preload.nextChapterFiles) {
            store.setReaderFiles(store.preload.nextChapterFiles);
            this.setStatus(`章节加载完成（使用缓存）。共 ${store.reader.files.length} 个文件`);
            store.preload.nextChapterFiles = null;

            await this.reader.loadChapter(store.reader.files, chapterData, store.series.current);
        } else {
            await this.loadChapterDataAndRender(chapterData);
        }

        this.reader.container.scrollTop = 0;

        storage.setCurrentSeries(store.series.current);
        storage.setCurrentChapterPath(chapterData.path_id);
    }

    async loadChapterDataAndRender(chapterData) {
        store.setReaderLoading(true);

        const seriesName = store.series.current;
        const { path_id } = chapterData;

        try {
            const data = await api.getChapterFiles(seriesName, path_id);

            if (!data || !data.files) throw new Error('Invalid API response');

            store.setReaderFiles(data.files);

            await this.reader.loadChapter(store.reader.files, chapterData, seriesName);

            this.setStatus(`章节加载完成，共 ${store.reader.files.length} 个文件`);

            this.preloadNextChapterMetadata();

        } catch (error) {
            this.setStatus('错误：加载文件元数据失败');
            console.error('Error loading files metadata:', error);
            store.reader.files = [];
            this.reader.container.innerHTML = '<div class="p-4 text-red-400">无法加载章节文件列表，请检查后端服务。</div>';
        } finally {
            store.setReaderLoading(false);
        }
    }

    async preloadNextChapterMetadata() {
        const nextIndex = store.chapters.currentIndex + 1;

        if (nextIndex >= store.chapters.flatList.length) {
            store.preload.nextChapterFiles = null;
            return;
        }

        const chapterData = store.chapters.flatList[nextIndex];
        const seriesName = store.series.current;
        const { path_id } = chapterData;

        try {
            const data = await api.getChapterFiles(seriesName, path_id);
            store.preload.nextChapterFiles = data.files || [];
            store.preload.nextChapterIndex = nextIndex;
        } catch (error) {
            store.preload.nextChapterFiles = null;
            console.error('Error preloading next chapter metadata:', error);
        }
    }

    openPrevChapter() {
        if (store.chapters.currentIndex > 0) {
            this.openChapter(store.chapters.currentIndex - 1);
        }
    }

    openNextChapter() {
        if (store.chapters.currentIndex < store.chapters.flatList.length - 1) {
            this.openChapter(store.chapters.currentIndex + 1);
        }
    }

    resetLoadingState() {
        store.resetReader();
        this.updateProgressStatus();
    }

    updateProgressStatus() {
        progressState.setLoadedPages(store.lazyLoad.loadedCount);

        this.elements.progressStatus.textContent = progressState.getBriefText();
        this.elements.progressStatus.title = `点击跳转页码 (或按 G 键)\n当前: ${progressState.getDisplayText()}`;

        this.elements.prevBtn.disabled = store.chapters.currentIndex <= 0;
        this.elements.nextBtn.disabled = store.chapters.currentIndex >= store.chapters.flatList.length - 1;

        this.updateRetryButtonVisibility();
    }

    updateRetryButtonVisibility() {
        let failedCount = 0;
        store.imageRetry.forEach((state) => {
            if (state.status === 'failed' && state.retries >= 3) {
                failedCount++;
            }
        });

        if (failedCount > 0) {
            this.elements.retryFailedBtn.style.display = 'block';
            this.elements.retryFailedBtn.textContent = `🔄 重试失败 (${failedCount})`;
        } else {
            this.elements.retryFailedBtn.style.display = 'none';
        }
    }

    retryAllFailedImages() {
        const failedContainers = [];
        const containers = this.reader.container.querySelectorAll('.lazy-image-container');

        containers.forEach(container => {
            const state = store.imageRetry.get(container);
            if (state && state.status === 'failed' && state.retries >= 3) {
                failedContainers.push(container);
            }
        });

        if (failedContainers.length === 0) {
            this.setStatus('没有失败的图片需要重试');
            return;
        }

        this.setStatus(`正在重试 ${failedContainers.length} 张失败的图片...`);

        failedContainers.forEach((container, index) => {
            setTimeout(() => {
                const state = store.imageRetry.get(container);
                state.retries = 0;
                state.status = 'loading';
                this.reader.loadImageElement(container);
            }, index * 500);
        });
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

        if (isNaN(pageNum) || pageNum < 1) {
            this.showInputError('请输入有效的页码');
            return;
        }
        if (pageNum > store.reader.files.length) {
            this.showInputError(`页码超出范围，最大为 ${store.reader.files.length}`);
            return;
        }

        this.hideJumpModal();
        this.reader.jumpToPage(pageNum);
        this.setStatus(`已跳转至第 ${pageNum} 页`);
    }

    showInputError(message) {
        this.elements.jumpPageInput.classList.add('border-red-500', 'ring-2', 'ring-red-200');
        this.elements.jumpPageInput.title = message;

        this.elements.jumpPageInput.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(5px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300, easing: 'ease-in-out' });

        setTimeout(() => {
            this.elements.jumpPageInput.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
            this.elements.jumpPageInput.title = '';
        }, 500);
    }

    async restoreReadingPosition() {
        const savedSeries = storage.getCurrentSeries();
        const savedChapterPath = storage.getCurrentChapterPath();

        await this.loadSeries();

        if (savedSeries) {
            await this.selectSeries(savedSeries);

            if (savedChapterPath && store.chapters.flatList.length > 0) {
                const savedIndex = store.chapters.flatList.findIndex(item => item.path_id === savedChapterPath);

                if (savedIndex !== -1) {
                    await this.openChapter(savedIndex, false);
                }
            }
        } else {
            if (store.series.list.length > 0) {
                await this.selectSeries(store.series.list[0]);
            } else {
                this.setStatus('请配置后端服务和漫画目录。');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});