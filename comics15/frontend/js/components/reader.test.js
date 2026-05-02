import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Reader } from './reader.js';
import { api } from '../services/api.js';
import { store } from '../state/store.js';
import { progressState } from '../state/progress-state.js';

class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
}

describe('Reader chapter source strategy', () => {
    let reader;

    beforeEach(() => {
        document.body.innerHTML = '<div id="reader"></div>';
        vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
        vi.stubGlobal('CustomEvent', window.CustomEvent);
        store.setCurrentSeries('Series');
        store.setCurrentChapterIndex(0);
        store.setReaderFiles([]);
        store.setReaderScale(100);
        store.resetLazyLoad();
        reader = new Reader();
    });

    afterEach(() => {
        store.resetLazyLoad();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('普通图片在章节首图源为 lq 时直接使用 LQ URL，不触发逐图 HEAD 解析', async () => {
        const resolveSpy = vi.spyOn(api, 'resolveImageUrl');

        await reader.loadChapter(['001.jpg'], {
            path_id: '第一卷/第 1 话',
            cover_source: 'lq',
        }, '测试系列');
        const container = document.querySelector('.lazy-image-container');

        await reader.loadImageElement(container);

        const img = container.querySelector('img');
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(img.getAttribute('src')).toBe('/lq_image/%E6%B5%8B%E8%AF%95%E7%B3%BB%E5%88%97/%E7%AC%AC%E4%B8%80%E5%8D%B7/%E7%AC%AC%201%20%E8%AF%9D/001.webp');
    });

    it('普通图片在章节首图源为 hq 时直接使用 HQ URL，不触发逐图 HEAD 解析', async () => {
        const resolveSpy = vi.spyOn(api, 'resolveImageUrl');

        await reader.loadChapter(['001.png'], {
            path_id: '第 2 话',
            cover_source: 'hq',
        }, 'Series');
        const container = document.querySelector('.lazy-image-container');

        await reader.loadImageElement(container);

        const img = container.querySelector('img');
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(img.getAttribute('src')).toBe('/hq_image/Series/%E7%AC%AC%202%20%E8%AF%9D/001.png');
    });

    it('普通图片缺少章节首图源时保留旧的逐图解析兜底', async () => {
        const resolveSpy = vi.spyOn(api, 'resolveImageUrl').mockResolvedValue({
            url: '/hq_image/Series/chapter/001.jpg',
            source: 'hq',
        });

        await reader.loadChapter(['001.jpg'], { path_id: 'chapter' }, 'Series');
        const container = document.querySelector('.lazy-image-container');

        await reader.loadImageElement(container);

        const img = container.querySelector('img');
        expect(resolveSpy).toHaveBeenCalledWith('Series', '001.jpg', 'chapter');
        expect(img.getAttribute('src')).toBe('/hq_image/Series/chapter/001.jpg');
    });

    it('视频和 GIF 始终走 video URL，不读取章节首图源也不触发逐图解析', async () => {
        const resolveSpy = vi.spyOn(api, 'resolveImageUrl');

        await reader.loadChapter(['clip.mp4', 'animation.gif'], {
            path_id: 'PV',
            cover_source: 'lq',
        }, 'Series');
        const containers = document.querySelectorAll('.lazy-image-container');

        await reader.loadImageElement(containers[0]);
        await reader.loadImageElement(containers[1]);

        const video = containers[0].querySelector('video');
        const gif = containers[1].querySelector('img');
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(video.getAttribute('src')).toBe('/video/Series/PV/clip.mp4');
        expect(gif.getAttribute('src')).toBe('/video/Series/PV/animation.gif');
    });

    it('图片加载完成时使用回调通知进度刷新，不派发全局事件', async () => {
        const onImageLoaded = vi.fn();
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        reader = new Reader({ onImageLoaded });

        await reader.loadChapter(['001.jpg'], {
            path_id: 'chapter',
            cover_source: 'hq',
        }, 'Series');
        const container = document.querySelector('.lazy-image-container');

        await reader.loadImageElement(container);
        container.querySelector('img').onload();

        expect(onImageLoaded).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'reader:imageLoaded' }));
    });

    it('页码变化时使用回调通知进度刷新，不派发全局事件', () => {
        vi.useFakeTimers();
        const onPageChanged = vi.fn();
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        reader = new Reader({ onPageChanged });
        progressState.init(3);
        reader.container.innerHTML = `
            <div class="lazy-image-container"></div>
            <div class="lazy-image-container"></div>
            <div class="lazy-image-container"></div>
        `;
        vi.spyOn(reader, 'calculateCurrentPage').mockReturnValue(2);

        reader.updateCurrentPageOnScroll();
        vi.advanceTimersByTime(100);

        expect(onPageChanged).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'reader:pageChanged' }));
        vi.useRealTimers();
    });

});
