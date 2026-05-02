// 阅读器控制壳模块

import { store } from '../state/store.js';
import { progressState } from '../state/progress-state.js';
import { $ } from '../utils/dom.js';
import { getReaderMenuVisibilityState } from '../utils/reader-controls.js';

export class ReaderShell {
    constructor(readerViewEl, readerEl, callbacks = {}) {
        this.readerView = readerViewEl;
        this.reader = readerEl;
        this.lastScrollTop = 0;
        this.onOpenPrev = callbacks.onOpenPrev || (() => {});
        this.onOpenNext = callbacks.onOpenNext || (() => {});
        this.onBackToDirectory = callbacks.onBackToDirectory || (() => {});
        this.onJumpToPage = callbacks.onJumpToPage || (() => {});

        this.elements = {
            readerMenuBtn: $('#readerMenuBtn'),
            readerActions: $('#readerActions'),
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

    bindEvents() {
        this.elements.readerMenuBtn.onclick = () => this.toggleActions();
        this.elements.backToDirectoryBtn.onclick = () => this.onBackToDirectory();
        this.elements.prevBtn.onclick = () => this.onOpenPrev();
        this.elements.nextBtn.onclick = () => this.onOpenNext();
        this.elements.progressStatus.onclick = () => this.showJumpModal();
        this.reader.addEventListener('scroll', () => this.handleScroll());
        this.elements.jumpCancelBtn.onclick = () => this.hideJumpModal();
        this.elements.jumpConfirmBtn.onclick = () => this.confirmJump();

        this.elements.jumpPageInput.onkeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.confirmJump();
            }
            if (event.key === 'Escape') {
                this.hideJumpModal();
            }
        };

        this.elements.jumpModal.onclick = (event) => {
            if (event.target === this.elements.jumpModal) {
                this.hideJumpModal();
            }
        };

        this.readerView.onclick = (event) => {
            if (!this.elements.readerActions.classList.contains('hidden')
                && !event.target.closest('#readerActions')
                && !event.target.closest('#readerMenuBtn')) {
                this.elements.readerActions.classList.add('hidden');
            }
        };
    }

    handleScroll() {
        const { shouldHide, nextScrollTop } = getReaderMenuVisibilityState({
            previousScrollTop: this.lastScrollTop,
            currentScrollTop: this.reader.scrollTop,
        });

        this.lastScrollTop = nextScrollTop;
        this.elements.readerMenuBtn.classList.toggle('hidden', shouldHide);
        if (shouldHide) {
            this.elements.readerActions.classList.add('hidden');
        }
    }

    toggleActions() {
        this.elements.readerActions.classList.toggle('hidden');
    }

    resetUi() {
        this.reader.innerHTML = '';
        this.elements.progressStatus.textContent = '0 / 0';
        this.lastScrollTop = 0;
        this.elements.readerMenuBtn.classList.remove('hidden');
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

    confirmJump() {
        const pageNum = parseInt(this.elements.jumpPageInput.value, 10);
        if (Number.isNaN(pageNum) || pageNum < 1 || pageNum > store.reader.files.length) {
            this.showInputError('请输入有效的页码');
            return;
        }
        this.hideJumpModal();
        this.onJumpToPage(pageNum);
    }

    showInputError(message) {
        this.elements.jumpPageInput.classList.add('border-red-500', 'ring-2', 'ring-red-200');
        this.elements.jumpPageInput.title = message;
        setTimeout(() => {
            this.elements.jumpPageInput.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
            this.elements.jumpPageInput.title = '';
        }, 500);
    }

    hideActions() {
        this.elements.readerActions.classList.add('hidden');
    }

    show() {
        this.readerView.classList.remove('hidden');
    }

    hide() {
        this.readerView.classList.add('hidden');
    }
}