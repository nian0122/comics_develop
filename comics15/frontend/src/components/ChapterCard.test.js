import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ChapterCard from './ChapterCard.vue';

// Mock chapter-tree utilities
vi.mock('../../js/utils/chapter-tree.js', () => ({
    getChapterDisplayName: vi.fn((node) => {
        if (!node) return '未命名章节';
        const parts = (node.path_id || '').split('/').filter(Boolean);
        return parts.at(-1) || node.name || '未命名章节';
    }),
    getParentPath: vi.fn((path) => {
        if (!path) return '';
        const parts = path.split('/').filter(Boolean);
        if (parts.length <= 1) return '';
        return parts.slice(0, -1).join('/');
    }),
    formatChapterProgress: vi.fn((progress, totalPages = 0) => {
        const pageSuffix = totalPages > 0 ? ` · ${totalPages} 页` : '';
        if (!progress || !progress.page) return `未读${pageSuffix}`;
        if (totalPages > 0 && progress.page >= totalPages) return `已读完${pageSuffix}`;
        return `读到 ${progress.page} 页${pageSuffix}`;
    })
}));

import { getChapterDisplayName, getParentPath, formatChapterProgress } from '../../js/utils/chapter-tree.js';

describe('ChapterCard', () => {
    let wrapper;

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.clearAllMocks();
    });

    describe('渲染结构', () => {
        it('渲染 chapter-card-v2 类名和 data-path-id 属性', () => {
            const chapter = {
                path_id: '第一卷/第1话',
                name: '第1话',
                total_files: 24
            };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: '测试系列'
                }
            });

            const card = wrapper.find('.chapter-card-v2');
            expect(card.exists()).toBe(true);
            expect(card.attributes('data-path-id')).toBe('第一卷/第1话');
        });

        it('渲染 chapter-card-body 内部结构：strong 标题、progress span、small 路径标签', () => {
            const chapter = {
                path_id: '第二卷/第5话',
                name: '第5话',
                total_files: 32
            };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: { page: 15 },
                    seriesName: '系列名称'
                }
            });

            const body = wrapper.find('.chapter-card-body');
            expect(body.exists()).toBe(true);

            const title = body.find('strong');
            expect(title.exists()).toBe(true);
            expect(title.text()).toBe('第5话');

            const progressEl = body.find('[data-progress-path]');
            expect(progressEl.exists()).toBe(true);
            expect(progressEl.text()).toContain('读到 15 页');

            const pathLabel = body.find('small');
            expect(pathLabel.exists()).toBe(true);
            expect(pathLabel.text()).toBe('第二卷');
        });

        it('渲染 chapter-cover skeleton 占位（无封面加载逻辑）', () => {
            const chapter = {
                path_id: '第1话',
                name: '第1话',
                total_files: 12
            };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: '系列'
                }
            });

            const cover = wrapper.find('.chapter-cover.skeleton');
            expect(cover.exists()).toBe(true);
            expect(cover.attributes('data-cover-path')).toBe('第1话');
        });
    });

    describe('进度显示', () => {
        it('显示未读状态当无进度数据', () => {
            const chapter = { path_id: 'test', name: 'Test', total_files: 48 };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: 'Series'
                }
            });

            expect(formatChapterProgress).toHaveBeenCalledWith(null, 48);
            const progressEl = wrapper.find('[data-progress-path]');
            expect(progressEl.text()).toBe('未读 · 48 页');
        });

        it('显示已读完状态', () => {
            const chapter = { path_id: 'test', name: 'Test', total_files: 20 };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: { page: 20 },
                    seriesName: 'Series'
                }
            });

            expect(formatChapterProgress).toHaveBeenCalledWith({ page: 20 }, 20);
            const progressEl = wrapper.find('[data-progress-path]');
            expect(progressEl.text()).toBe('已读完 · 20 页');
        });

        it('显示阅读中状态', () => {
            const chapter = { path_id: 'test', name: 'Test', total_files: 30 };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: { page: 12 },
                    seriesName: 'Series'
                }
            });

            expect(formatChapterProgress).toHaveBeenCalledWith({ page: 12 }, 30);
            const progressEl = wrapper.find('[data-progress-path]');
            expect(progressEl.text()).toBe('读到 12 页 · 30 页');
        });
    });

    describe('路径标签显示', () => {
        it('显示父目录路径作为路径标签', () => {
            const chapter = { path_id: '第一卷/子目录/第3话', name: '第3话' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: '系列'
                }
            });

            expect(getParentPath).toHaveBeenCalledWith('第一卷/子目录/第3话');
            const pathLabel = wrapper.find('.chapter-card-body small');
            expect(pathLabel.text()).toBe('第一卷/子目录');
        });

        it('显示系列名称当无父路径（顶级章节）', () => {
            const chapter = { path_id: '第1话', name: '第1话' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: '顶级系列'
                }
            });

            expect(getParentPath).toHaveBeenCalledWith('第1话');
            const pathLabel = wrapper.find('.chapter-card-body small');
            expect(pathLabel.text()).toBe('顶级系列');
        });
    });

    describe('点击事件', () => {
        it('点击卡片触发 open 事件并传递 path_id', async () => {
            const chapter = { path_id: '卷/话', name: '话' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: 'Series'
                }
            });

            const card = wrapper.find('.chapter-card-v2');
            await card.trigger('click');

            expect(wrapper.emitted('open')).toBeTruthy();
            expect(wrapper.emitted('open')[0]).toEqual(['卷/话']);
        });
    });

    describe('显示名称', () => {
        it('使用 getChapterDisplayName 计算显示名称', () => {
            const chapter = { path_id: 'A/B/C', name: 'C章' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: 'S'
                }
            });

            expect(getChapterDisplayName).toHaveBeenCalledWith(chapter);
            const title = wrapper.find('.chapter-card-body strong');
            expect(title.text()).toBe('C');
        });

        it('处理中文路径', () => {
            const chapter = { path_id: '第一卷/第十话', name: '第十话' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: '中文系列'
                }
            });

            expect(getChapterDisplayName).toHaveBeenCalledWith(chapter);
            const title = wrapper.find('.chapter-card-body strong');
            expect(title.text()).toBe('第十话');
        });
    });

    describe('封面渲染', () => {
        it('当 cover prop 有值时渲染 img 元素', () => {
            const chapter = { path_id: '卷/话', name: '话' };
            const coverUrl = '/lq_image/series/chapter/cover.webp';

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: 'Series',
                    cover: coverUrl
                }
            });

            const coverContainer = wrapper.find('.chapter-cover');
            expect(coverContainer.exists()).toBe(true);
            expect(coverContainer.classes()).not.toContain('skeleton');

            const img = coverContainer.find('img');
            expect(img.exists()).toBe(true);
            expect(img.attributes('src')).toBe(coverUrl);
        });

        it('当 cover prop 为空时渲染 skeleton 占位', () => {
            const chapter = { path_id: '卷/话', name: '话' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: 'Series',
                    cover: ''
                }
            });

            const coverContainer = wrapper.find('.chapter-cover');
            expect(coverContainer.exists()).toBe(true);
            expect(coverContainer.classes()).toContain('skeleton');
            expect(coverContainer.find('img').exists()).toBe(false);
        });

        it('当无 cover prop 时渲染 skeleton 占位（默认值）', () => {
            const chapter = { path_id: '卷/话', name: '话' };

            wrapper = mount(ChapterCard, {
                props: {
                    chapter,
                    progress: null,
                    seriesName: 'Series'
                }
            });

            const coverContainer = wrapper.find('.chapter-cover');
            expect(coverContainer.exists()).toBe(true);
            expect(coverContainer.classes()).toContain('skeleton');
            expect(coverContainer.find('img').exists()).toBe(false);
        });
    });
});
