import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReaderShell } from './reader-shell.js';
import { store } from '../state/store.js';
import { progressState } from '../state/progress-state.js';

function renderShellDom() {
    document.body.innerHTML = `
        <section id="readerView">
            <button id="readerMenuBtn"></button>
            <div id="readerActions" class="hidden"></div>
            <button id="backToDirectoryBtn"></button>
            <button id="prevBtn"></button>
            <button id="nextBtn"></button>
            <button id="progressStatus"></button>
            <div id="jumpModal" class="hidden"></div>
            <input id="jumpPageInput">
            <button id="jumpCancelBtn"></button>
            <button id="jumpConfirmBtn"></button>
            <span id="totalPages"></span>
            <div id="reader"></div>
        </section>
    `;
}

describe('ReaderShell store subscriptions', () => {
    let shell;

    beforeEach(() => {
        renderShellDom();
        store._listeners.clear();
        store.setChapters([{ path_id: '1' }, { path_id: '2' }], []);
        store.setCurrentChapterIndex(0);
        store.setReaderFiles(['001.jpg', '002.jpg']);
        progressState.init(2);
        shell = new ReaderShell(
            document.querySelector('#readerView'),
            document.querySelector('#reader')
        );
    });

    afterEach(() => {
        shell?.destroy();
        store._listeners.clear();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('根据 lazyLoad 订阅自动刷新阅读进度文本', () => {
        shell.bindEvents();

        store.incrementLazyLoadedCount();

        expect(document.querySelector('#progressStatus').textContent).toBe('1 / 2');
    });

    it('根据 chapters 订阅自动刷新章节切换按钮状态', () => {
        shell.bindEvents();

        store.setCurrentChapterIndex(1);

        expect(document.querySelector('#prevBtn').disabled).toBe(false);
        expect(document.querySelector('#nextBtn').disabled).toBe(true);
    });
});
