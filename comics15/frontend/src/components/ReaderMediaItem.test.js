import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ReaderMediaItem from './ReaderMediaItem.vue';

// Mock file-type utilities
vi.mock('../utils/file-type.js', () => ({
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
    })
}));

// Mock constants
vi.mock('../config/constants.js', () => ({
    IMAGE_RETRY_CONFIG: {
        MAX_RETRIES: 3,
        INITIAL_DELAY: 1000,
        MAX_DELAY: 10000,
        BACKOFF_MULTIPLIER: 2
    },
    DOUBLE_CLICK_THRESHOLD: 300
}));

describe('ReaderMediaItem', () => {
    let wrapper;

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.clearAllMocks();
    });

    // 测试用的文件对象（模拟后端返回的结构）
    const createMockFile = (overrides = {}) => ({
        name: '001.jpg',
        baseName: '001',
        mediaType: 'image',
        preferredSource: 'lq',
        hq: {
            exists: true,
            size: 1234567,
            url: '/hq_image/Series/chapter/001.jpg'
        },
        lq: {
            exists: true,
            url: '/lq_image/Series/chapter/001.webp'
        },
        path_id: 'chapter',
        ...overrides
    });

    describe('DOM 结构', () => {
        it('渲染 lazy-image-container 容器和 data 属性', async () => {
            const mockFile = createMockFile();
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            const container = wrapper.find('.lazy-image-container');
            expect(container.exists()).toBe(true);
            expect(container.attributes('data-index')).toBe('0');
            expect(container.attributes('data-filename')).toBe('001.jpg');
            expect(container.attributes('data-path-id')).toBe('chapter');
            expect(container.attributes('data-series-name')).toBe('Series');
            expect(container.attributes('data-cover-source')).toBe('lq');
        });

        it('渲染 skeleton-wrapper 和 skeleton-image 骨架屏占位', async () => {
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: createMockFile(),
                    index: 0,
                    seriesName: 'Series'
                }
            });

            expect(wrapper.find('.skeleton-wrapper').exists()).toBe(true);
            expect(wrapper.find('.skeleton-image').exists()).toBe(true);
        });
    });

    describe('URL 选择 - preferredSource 策略', () => {
        it('preferredSource=lq 时使用 file.lq.url', async () => {
            const mockFile = createMockFile({ preferredSource: 'lq' });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('.reader-img');
            expect(img.attributes('src')).toBe('/lq_image/Series/chapter/001.webp');
        });

        it('preferredSource=hq 时使用 file.hq.url', async () => {
            const mockFile = createMockFile({ preferredSource: 'hq' });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('.reader-img');
            expect(img.attributes('src')).toBe('/hq_image/Series/chapter/001.jpg');
        });

        it('forceHQ=true 时强制使用 file.hq.url', async () => {
            const mockFile = createMockFile({ preferredSource: 'lq' });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia(true); // forceHQ = true
            await flushPromises();

            const img = wrapper.find('.reader-img');
            expect(img.attributes('src')).toBe('/hq_image/Series/chapter/001.jpg');
        });

        it('LQ URL 不存在时回退到 HQ URL', async () => {
            const mockFile = createMockFile({ 
                preferredSource: 'lq',
                lq: { exists: false, url: '' }
            });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('.reader-img');
            expect(img.attributes('src')).toBe('/hq_image/Series/chapter/001.jpg');
        });
    });

    describe('视频文件处理', () => {
        it('视频类型使用 file.videoUrl', async () => {
            const mockFile = createMockFile({
                name: 'video.mp4',
                mediaType: 'video',
                videoUrl: '/video/Series/chapter/video.mp4',
                hq: { exists: true, size: 9876543, url: '/hq_image/Series/chapter/video.mp4' }
            });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const video = wrapper.find('video');
            expect(video.exists()).toBe(true);
            expect(video.attributes('src')).toBe('/video/Series/chapter/video.mp4');
        });

        it('GIF 类型使用 file.videoUrl', async () => {
            const mockFile = createMockFile({
                name: 'animation.gif',
                mediaType: 'video',
                videoUrl: '/video/Series/chapter/animation.gif',
                hq: { exists: true, size: 123456, url: '/hq_image/Series/chapter/animation.gif' }
            });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            // GIF 应该渲染为 img 标签（根据 getFileType 返回 'gif'）
            const img = wrapper.find('.reader-img');
            expect(img.exists()).toBe(true);
        });
    });

    describe('事件处理', () => {
        it('加载成功后触发 loaded 事件', async () => {
            const mockFile = createMockFile();
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            // 模拟图片加载成功
            const img = wrapper.find('.reader-img');
            await img.trigger('load');

            expect(wrapper.emitted('loaded')).toBeTruthy();
            expect(wrapper.emitted('loaded')[0]).toEqual([{ index: 0, filename: '001.jpg' }]);
        });

        it('LQ 加载失败时回退到 HQ', async () => {
            const mockFile = createMockFile({ preferredSource: 'lq' });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            // 初始应该是 LQ
            let img = wrapper.find('.reader-img');
            expect(img.attributes('src')).toBe('/lq_image/Series/chapter/001.webp');

            // 模拟加载失败
            await img.trigger('error');
            await flushPromises();

            // 应该切换到 HQ
            img = wrapper.find('.reader-img');
            expect(img.attributes('src')).toBe('/hq_image/Series/chapter/001.jpg');
        });
    });

    describe('scale 属性', () => {
        it('应用 scale 到图片宽度', async () => {
            const mockFile = createMockFile();
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series',
                    scale: 75
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            const img = wrapper.find('.reader-img');
            expect(img.attributes('style')).toContain('width: 75%');
        });
    });

    describe('边界情况', () => {
        it('文件对象缺少 URL 时标记为失败', async () => {
            const mockFile = {
                name: 'broken.jpg',
                mediaType: 'image',
                preferredSource: 'lq',
                hq: { exists: false, url: '' },
                lq: { exists: false, url: '' }
            };
            
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(wrapper.emitted('failed')).toBeTruthy();
        });

        it('不支持的文件类型不渲染', async () => {
            const mockFile = createMockFile({ name: 'document.pdf', mediaType: null });
            wrapper = mount(ReaderMediaItem, {
                props: {
                    file: mockFile,
                    index: 0,
                    seriesName: 'Series'
                }
            });

            await wrapper.vm.loadMedia();
            await flushPromises();

            expect(wrapper.find('.reader-img').exists()).toBe(false);
            expect(wrapper.find('video').exists()).toBe(false);
        });
    });
});
