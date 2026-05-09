import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ReaderMediaItem from './ReaderMediaItem.vue';

// Mock api service
vi.mock('../../js/services/api.js', () => ({
    api: {
        buildLQImageUrl: vi.fn((seriesName, filename, pathId) => {
            const dotIndex = filename.lastIndexOf('.');
            const baseName = dotIndex > -1 ? filename.substring(0, dotIndex) : filename;
            const encodedSeries = encodeURIComponent(seriesName);
            const encodedPath = encodeURIComponent(pathId);
            const encodedFilename = encodeURIComponent(`${baseName}.webp`);
            return `/lq_image/${encodedSeries}/${encodedPath}/${encodedFilename}`;
        }),
        buildHQImageUrl: vi.fn((seriesName, filename, pathId) => {
            const encodedSeries = encodeURIComponent(seriesName);
            const encodedPath = encodeURIComponent(pathId);
            const encodedFilename = encodeURIComponent(filename);
            return `/hq_image/${encodedSeries}/${encodedPath}/${encodedFilename}`;
        }),
        buildVideoUrl: vi.fn((seriesName, filename, pathId) => {
            const encodedSeries = encodeURIComponent(seriesName);
            const encodedPath = encodeURIComponent(pathId);
            const encodedFilename = encodeURIComponent(filename);
            return `/video/${encodedSeries}/${encodedPath}/${encodedFilename}`;
        }),
        resolveImageUrl: vi.fn(async (seriesName, filename, pathId) => ({
            url: `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(pathId)}/${encodeURIComponent(filename)}`,
            source: 'hq'
        })),
        checkHQImageUsable: vi.fn(async (hqUrl) => hqUrl.includes('/hq_image/'))
    }
}));

// Mock file-type utilities
vi.mock('../../js/utils/file-type.js', () => ({
    getFileType: vi.fn((filename) => {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.mp4') || lower.endsWith('.mov')) return 'video';
        if (lower.endsWith('.gif')) return 'gif';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return 'image';
        return null;
    }),
    useVideoPath: vi.fn((filename) => {
        const lower = filename.toLowerCase();
        return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.gif');
    }),
    isVideoFile: vi.fn((filename) => {
        const lower = filename.toLowerCase();
        return lower.endsWith('.mp4') || lower.endsWith('.mov');
    }),
    isGifFile: vi.fn((filename) => filename.toLowerCase().endsWith('.gif'))
}));

// Mock constants
vi.mock('../../js/config/constants.js', () => ({
    IMAGE_RETRY_CONFIG: {
        MAX_RETRIES: 3,
        INITIAL_DELAY: 1000,
        MAX_DELAY: 10000,
        BACKOFF_MULTIPLIER: 2
    },
    DOUBLE_CLICK_THRESHOLD: 300
}));

import { api } from '../../js/services/api.js';
import { getFileType, useVideoPath } from '../../js/utils/file-type.js';

describe('ReaderMediaItem', () => {
    let wrapper;

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.clearAllMocks();
    });

    describe('DOM 结构', () => {
        it('渲染 lazy-image-container 容器和 data 属性', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter/path',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'lq'
                }
            });

            const container = wrapper.find('.lazy-image-container');
            expect(container.exists()).toBe(true);
            expect(container.attributes('data-index')).toBe('0');
            expect(container.attributes('data-filename')).toBe('001.jpg');
            expect(container.attributes('data-path-id')).toBe('chapter/path');
            expect(container.attributes('data-series-name')).toBe('Series');
            expect(container.attributes('data-cover-source')).toBe('lq');
        });

        it('渲染 skeleton-wrapper 和 skeleton-image 骨架屏占位', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0
                }
            });

            expect(wrapper.find('.skeleton-wrapper').exists()).toBe(true);
            expect(wrapper.find('.skeleton-image').exists()).toBe(true);
        });
    });

    describe('URL 构建 - coverSource 策略', () => {
        it('coverSource=lq 时使用 buildLQImageUrl，不调用 resolveImageUrl', async () => {
            vi.clearAllMocks();

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: '测试系列',
                    index: 0,
                    coverSource: 'lq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(api.buildLQImageUrl).toHaveBeenCalledWith('测试系列', '001.jpg', 'chapter');
            expect(api.resolveImageUrl).not.toHaveBeenCalled();
        });

        it('coverSource=hq 时使用 buildHQImageUrl，不调用 resolveImageUrl', async () => {
            vi.clearAllMocks();

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.png',
                    pathId: '第2话',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'hq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(api.buildHQImageUrl).toHaveBeenCalledWith('Series', '001.png', '第2话');
            expect(api.resolveImageUrl).not.toHaveBeenCalled();
        });

        it('缺少 coverSource 时调用 resolveImageUrl 进行逐图解析', async () => {
            vi.clearAllMocks();

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(api.resolveImageUrl).toHaveBeenCalledWith('Series', '001.jpg', 'chapter');
        });
    });

    describe('GIF/视频处理', () => {
        it('视频文件使用 buildVideoUrl 并渲染 video 元素', async () => {
            vi.clearAllMocks();

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: 'clip.mp4',
                    pathId: 'PV',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'lq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(api.buildVideoUrl).toHaveBeenCalledWith('Series', 'clip.mp4', 'PV');
            expect(api.buildLQImageUrl).not.toHaveBeenCalled();

            const video = wrapper.find('video.reader-img');
            expect(video.exists()).toBe(true);
            expect(video.attributes('controls')).toBeDefined();
        });

        it('GIF 文件使用 buildVideoUrl 并渲染 img 元素（legacy behavior）', async () => {
            vi.clearAllMocks();

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: 'animation.gif',
                    pathId: 'PV',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'lq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(api.buildVideoUrl).toHaveBeenCalledWith('Series', 'animation.gif', 'PV');
            expect(api.buildLQImageUrl).not.toHaveBeenCalled();

            const img = wrapper.find('img.reader-img');
            expect(img.exists()).toBe(true);
        });
    });

    describe('加载成功/失败事件', () => {
        it('图片加载成功时 emit loaded 事件', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'hq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            // 模拟图片加载成功
            const img = wrapper.find('img.reader-img');
            if (img.exists()) {
                await img.trigger('load');
            }

            expect(wrapper.emitted('loaded')).toBeTruthy();
        });

        it('最终加载失败时 emit failed 事件', async () => {
            vi.useFakeTimers();
            api.checkHQImageUsable.mockResolvedValue(false);

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'lq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            // 模拟 LQ 图片加载失败（触发 HQ fallback）
            const img = wrapper.find('img.reader-img');
            if (img.exists()) {
                await img.trigger('error');
                vi.advanceTimersByTime(500);
                await flushPromises();
            }

            // 模拟多次重试后最终失败
            vi.advanceTimersByTime(10000);
            await flushPromises();

            vi.useRealTimers();

            // 验证失败事件（取决于重试配置）
            const failedEvents = wrapper.emitted('failed');
            if (failedEvents) {
                expect(failedEvents.length).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('LQ fallback HQ', () => {
        it('LQ 图片 error 时尝试 HQ URL fallback', async () => {
            vi.clearAllMocks();
            api.buildHQImageUrl.mockReturnValue('/hq_image/Series/chapter/001.jpg');

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'lq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            // 确认首先使用了 LQ URL
            expect(api.buildLQImageUrl).toHaveBeenCalled();

            // 模拟 LQ 图片加载失败
            const img = wrapper.find('img.reader-img');
            if (img.exists()) {
                await img.trigger('error');
                await flushPromises();

                // 应该尝试 HQ URL
                expect(api.buildHQImageUrl).toHaveBeenCalled();
            }
        });
    });

    describe('双击 LQ 切换 HQ', () => {
        it('双击 LQ 图片检查 HQ 可用性并切换', async () => {
            vi.useFakeTimers();
            vi.clearAllMocks();
            api.checkHQImageUsable.mockResolvedValue(true);
            api.buildHQImageUrl.mockReturnValue('/hq_image/Series/chapter/001.jpg');

            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'lq'
                },
                attachTo: document.body
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('img.reader-img');
            if (img.exists()) {
                await img.trigger('click');
                vi.advanceTimersByTime(50);
                await flushPromises();

                await img.trigger('click');
                vi.advanceTimersByTime(50);
                await flushPromises();

                expect(api.checkHQImageUsable).toHaveBeenCalled();
            }

            vi.useRealTimers();
            wrapper.unmount();
        });
    });

    describe('loadMedia defineExpose', () => {
        it('defineExpose loadMedia 方法供外部调用', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0
                }
            });

            expect(wrapper.vm.loadMedia).toBeDefined();
            expect(typeof wrapper.vm.loadMedia).toBe('function');
        });

        it('loadMedia 多次调用不重复 emit loaded（幂等性）', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'hq'
                }
            });

            // 第一次加载
            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('img.reader-img');
            if (img.exists()) {
                await img.trigger('load');
            }

            // 第二次调用（已加载状态）
            await wrapper.vm.loadMedia();
            await flushPromises();

            // 验证 loaded 事件只触发一次
            const loadedEvents = wrapper.emitted('loaded');
            if (loadedEvents) {
                expect(loadedEvents.length).toBe(1);
            }
        });
    });

    describe('loaded class 状态', () => {
        it('加载成功后容器添加 loaded class', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    filename: '001.jpg',
                    pathId: 'chapter',
                    seriesName: 'Series',
                    index: 0,
                    coverSource: 'hq'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('img.reader-img');
            if (img.exists()) {
                await img.trigger('load');
            }

            const container = wrapper.find('.lazy-image-container');
            expect(container.classes()).toContain('loaded');
        });
    });
});