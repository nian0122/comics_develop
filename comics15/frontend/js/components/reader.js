// 阅读器组件

import { store } from '../state/store.js';
import { progressState } from '../state/progress-state.js';
import { api } from '../services/api.js';
import { $ } from '../utils/dom.js';
import { getFileType, useVideoPath } from '../utils/file-type.js';
import { LAZY_LOAD_CONFIG, IMAGE_RETRY_CONFIG, DOUBLE_CLICK_THRESHOLD } from '../config/constants.js';

export class Reader {
    constructor() {
        this.container = $('#reader');
        this.preloaderContainer = $('#preloader-container');
        this.lastClickTime = 0;
        this.scrollUpdateTimer = null;

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => this.handleImageClick(e));

        this.container.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    handleImageClick(e) {
        if (!e.target.classList.contains('reader-img') || e.target.tagName !== 'IMG') {
            return;
        }

        const currentTime = Date.now();

        if (currentTime - this.lastClickTime < DOUBLE_CLICK_THRESHOLD) {
            e.preventDefault();

            const img = e.target;
            const originalSrc = img.src;

            if (originalSrc.includes('/hq_image/') || !originalSrc.includes('/api/image/')) {
                return;
            }

            const hqSrc = api.getHQImageUrlFromLQ(originalSrc);

            img.style.pointerEvents = 'none';
            img.src = hqSrc;

            img.onload = () => {
                img.style.pointerEvents = 'auto';
            };

            img.onerror = () => {
                img.style.pointerEvents = 'auto';
                img.src = originalSrc;
            };

            this.lastClickTime = 0;
        } else {
            this.lastClickTime = currentTime;
        }
    }

    handleScroll() {
        this.updateCurrentPageOnScroll();

        const st = this.container.scrollTop;
        const deltaY = st - (this._lastScrollPos || 0);

        if (Math.abs(deltaY) > 50) {
            const header = document.querySelector('.header');
            const footer = document.querySelector('.footer');

            if (st < 10) {
                header?.classList.remove('hidden');
                footer?.classList.remove('hidden');
            } else if (deltaY > 0 && !header?.classList.contains('hidden')) {
                header?.classList.add('hidden');
                footer?.classList.add('hidden');
            } else if (deltaY < 0 && header?.classList.contains('hidden')) {
                header?.classList.remove('hidden');
                footer?.classList.remove('hidden');
            }

            this._lastScrollPos = st;
        }
    }

    updateCurrentPageOnScroll() {
        if (this.scrollUpdateTimer) return;

        this.scrollUpdateTimer = setTimeout(() => {
            const currentPage = this.calculateCurrentPage();
            if (currentPage !== progressState.currentPage) {
                progressState.setCurrentPage(currentPage);
            }
            this.scrollUpdateTimer = null;
        }, 100);
    }

    calculateCurrentPage() {
        const containers = this.container.querySelectorAll('.lazy-image-container');
        if (containers.length === 0) return 1;

        const readerRect = this.container.getBoundingClientRect();
        const viewportCenter = readerRect.top + readerRect.height / 2;

        let minDistance = Infinity;
        let closestIndex = 0;

        containers.forEach((container, index) => {
            const rect = container.getBoundingClientRect();
            const containerCenter = rect.top + rect.height / 2;
            const distance = Math.abs(containerCenter - viewportCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex + 1;
    }

    async loadChapter(files, chapterData, seriesName) {
        this.clear();

        progressState.init(files.length);

        const savedProgress = progressState.restoreFromStorage(seriesName, store.chapters.currentIndex);
        if (savedProgress) {
            window.dispatchEvent(new CustomEvent('status:update', {
                detail: { message: `已恢复阅读进度：第 ${savedProgress.page} 页` }
            }));
        }

        this.initLazyObserver();

        const fragment = document.createDocumentFragment();
        const { path_id } = chapterData;

        files.forEach((filename, index) => {
            const container = document.createElement('div');
            container.className = 'lazy-image-container';
            container.dataset.index = index;
            container.dataset.filename = filename;
            container.dataset.pathId = path_id;
            container.dataset.seriesName = seriesName;
            container.dataset.loaded = 'false';

            container.innerHTML = `
                <div class="skeleton-wrapper">
                    <div class="skeleton-image skeleton" style="height: 200px;"></div>
                </div>
            `;

            fragment.appendChild(container);
        });

        this.container.appendChild(fragment);

        this.observeNextBatch();

        if (savedProgress && savedProgress.page > 1) {
            setTimeout(() => {
                this.jumpToPage(savedProgress.page);
            }, 100);
        }
    }

    jumpToPage(pageNum) {
        if (pageNum < 1 || pageNum > store.reader.files.length) return;

        const targetIndex = pageNum - 1;
        const targetElement = this.container.querySelector(`.lazy-image-container[data-index="${targetIndex}"]`);

        if (targetElement) {
            this.loadImageAtIndex(targetIndex);
            this.preloadImagesAround(targetIndex);
            targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }

    loadImageAtIndex(index) {
        const container = this.container.querySelector(`.lazy-image-container[data-index="${index}"]`);
        if (container && container.dataset.loaded === 'false') {
            this.loadImageElement(container);
        }
    }

    preloadImagesAround(targetIndex) {
        const start = Math.max(0, targetIndex - 3);
        const end = Math.min(store.reader.files.length - 1, targetIndex + 3);

        for (let i = start; i <= end; i++) {
            if (i !== targetIndex) {
                this.loadImageAtIndex(i);
            }
        }
    }

    loadImageElement(container) {
        const { filename, pathId, seriesName } = container.dataset;
        const fileType = getFileType(filename);

        if (!fileType) return;

        const retryState = this.getRetryState(container);

        if (retryState.status === 'success') return;
        if (retryState.retries >= IMAGE_RETRY_CONFIG.MAX_RETRIES && retryState.status === 'failed') return;

        const url = api.buildMediaUrl(filename, pathId, seriesName, useVideoPath(filename));

        this.clearMediaElement(container);

        let element;
        if (fileType === 'video') {
            element = document.createElement('video');
            element.className = 'reader-img';
            element.controls = true;
            element.autoplay = false;
            element.loop = false;
            element.preload = 'metadata';
            element.style.maxHeight = '80vh';
            element.style.width = store.reader.scale + '%';
        } else {
            element = document.createElement('img');
            element.className = 'reader-img';
            element.loading = 'lazy';
            element.decoding = 'async';
            element.style.width = store.reader.scale + '%';
        }

        const onSuccess = () => {
            if (retryState.timeoutId) {
                clearTimeout(retryState.timeoutId);
                retryState.timeoutId = null;
            }

            retryState.status = 'success';
            retryState.retries = 0;

            container.classList.add('loaded');
            container.classList.remove('failed');
            store.lazyLoad.loadedCount++;

            window.dispatchEvent(new CustomEvent('reader:imageLoaded'));
        };

        const onError = () => {
            retryState.retries++;

            if (retryState.retries >= IMAGE_RETRY_CONFIG.MAX_RETRIES) {
                retryState.status = 'failed';
                container.classList.add('loaded', 'failed');
                store.lazyLoad.loadedCount++;
            } else {
                retryState.status = 'retrying';
                const delay = IMAGE_RETRY_CONFIG.INITIAL_DELAY * Math.pow(IMAGE_RETRY_CONFIG.BACKOFF_MULTIPLIER, retryState.retries);

                retryState.timeoutId = setTimeout(() => {
                    retryState.status = 'loading';
                    this.loadImageElement(container);
                }, Math.min(delay, IMAGE_RETRY_CONFIG.MAX_DELAY));
            }
        };

        if (fileType === 'video') {
            element.onloadeddata = onSuccess;
            element.onerror = onError;
        } else {
            element.onload = onSuccess;
            element.onerror = onError;
        }

        const timeoutId = setTimeout(() => {
            if (retryState.status === 'loading') {
                element.src = '';
                onError();
            }
        }, 10000);

        element._timeoutId = timeoutId;

        container.appendChild(element);
        element.src = url;

        container.dataset.loaded = 'true';
    }

    getRetryState(container) {
        if (!store.imageRetry.has(container)) {
            store.imageRetry.set(container, {
                retries: 0,
                status: 'idle',
                lastError: null,
                timeoutId: null
            });
        }
        return store.imageRetry.get(container);
    }

    clearMediaElement(container) {
        const existingElement = container.querySelector('img, video');
        if (existingElement) {
            existingElement.src = '';
            existingElement.load && existingElement.load();
        }
        container.innerHTML = '';
    }

    initLazyObserver() {
        if (store.lazyLoad.observer) {
            store.lazyLoad.observer.disconnect();
        }

        store.lazyLoad.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const container = entry.target;
                        const retryState = store.imageRetry.get(container);

                        if (retryState && retryState.status === 'retrying') return;
                        if (retryState && retryState.status === 'success') return;

                        this.loadImageElement(container);
                    }
                });
            },
            {
                rootMargin: LAZY_LOAD_CONFIG.ROOT_MARGIN,
                threshold: 0
            }
        );

        store.lazyLoad.nextToObserve = 0;
        store.lazyLoad.loadedCount = 0;
    }

    observeNextBatch() {
        if (!store.lazyLoad.observer) return;

        const allContainers = this.container.querySelectorAll('.lazy-image-container');
        const totalContainers = allContainers.length;

        const endIndex = Math.min(
            store.lazyLoad.nextToObserve + LAZY_LOAD_CONFIG.BATCH_SIZE,
            totalContainers
        );

        for (let i = store.lazyLoad.nextToObserve; i < endIndex; i++) {
            const container = allContainers[i];
            if (container && container.dataset.loaded !== 'true') {
                store.lazyLoad.observer.observe(container);
            }
            store.lazyLoad.nextToObserve = i + 1;
        }

        store.lazyLoad.nextToObserve = endIndex;
    }

    clear() {
        store.resetLazyLoad();
        this.container.innerHTML = '';
    }

    scrollToTop() {
        this.container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setScale(scale) {
        store.setReaderScale(scale);
        this.container.querySelectorAll('.reader-img').forEach(img => {
            img.style.width = scale + '%';
        });
    }
}