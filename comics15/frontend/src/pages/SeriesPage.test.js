import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SeriesPage from './SeriesPage.vue';

// Mock router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: mockPush
    }),
    useRoute: () => ({
        name: 'seriesList'
    })
}));

// Mock router helpers
vi.mock('../router/index.js', () => ({
    toSeriesUrl: (name) => `/series/${encodeURIComponent(name)}`
}));

// Mock series store
vi.mock('../stores/series-store.js', () => ({
    useSeriesStore: vi.fn()
}));

// Mock storage service
vi.mock('../../js/services/storage.js', () => ({
    storage: {
        getSeriesLastReading: vi.fn()
    }
}));

import { useSeriesStore } from '../stores/series-store.js';
import { storage } from '../../js/services/storage.js';
import { toSeriesUrl } from '../router/index.js';

describe('SeriesPage', () => {
    let mockStore;
    let wrapper;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();

        // Default mock store state
        mockStore = {
            list: ['测试系列', 'Another', '中文系列'],
            loading: false,
            error: null,
            loadSeries: vi.fn().mockResolvedValue(['测试系列', 'Another', '中文系列']),
            setCurrentSeries: vi.fn()
        };
        useSeriesStore.mockReturnValue(mockStore);

        // Default storage mock
        storage.getSeriesLastReading.mockReturnValue(null);
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.restoreAllMocks();
    });

    describe('系列列表渲染', () => {
        it('渲染系列列表并展示阅读提示', async () => {
            storage.getSeriesLastReading.mockImplementation((name) => {
                if (name === '测试系列') {
                    return { page: 8, totalPages: 20 };
                }
                return null;
            });

            wrapper = mount(SeriesPage);

            const rows = wrapper.findAll('.series-row');
            expect(rows.length).toBe(3);

            const hint = wrapper.find('.series-reading-hint');
            expect(hint.exists()).toBe(true);
            expect(hint.text()).toContain('读到第 8/20 页');

            // 第二行和第三行没有阅读提示
            expect(rows[1].find('.series-reading-hint').exists()).toBe(false);
            expect(rows[2].find('.series-reading-hint').exists()).toBe(false);
        });

        it('显示空状态当系列列表为空', async () => {
            mockStore.list = [];
            useSeriesStore.mockReturnValue(mockStore);

            wrapper = mount(SeriesPage);

            expect(wrapper.find('.series-list').exists()).toBe(true);
            expect(wrapper.text()).toContain('暂无系列');
        });

        it('显示加载状态', async () => {
            mockStore.loading = true;
            mockStore.list = [];
            useSeriesStore.mockReturnValue(mockStore);

            wrapper = mount(SeriesPage);

            expect(wrapper.text()).toContain('正在加载系列...');
        });
    });

    describe('搜索过滤', () => {
        it('搜索输入时仅隐藏不匹配的系列行', async () => {
            wrapper = mount(SeriesPage);

            const searchInput = wrapper.find('#seriesSearch');
            await searchInput.setValue('be');

            const rows = wrapper.findAll('.series-row');
            expect(rows[0].element.hidden).toBe(true);
            expect(rows[1].element.hidden).toBe(true);
            expect(rows[2].element.hidden).toBe(true);

            await searchInput.setValue('  ');
            expect(rows[0].element.hidden).toBe(false);
            expect(rows[1].element.hidden).toBe(false);
            expect(rows[2].element.hidden).toBe(false);
        });

        it('中文搜索正常过滤', async () => {
            wrapper = mount(SeriesPage);

            const searchInput = wrapper.find('#seriesSearch');
            await searchInput.setValue('中文');

            const rows = wrapper.findAll('.series-row');
            expect(rows[0].element.hidden).toBe(true);
            expect(rows[1].element.hidden).toBe(true);
            expect(rows[2].element.hidden).toBe(false);
        });
    });

    describe('点击导航', () => {
        it('点击系列时调用 setCurrentSeries 并 router.push', async () => {
            wrapper = mount(SeriesPage);

            const rows = wrapper.findAll('.series-row');
            await rows[0].trigger('click');

            expect(mockStore.setCurrentSeries).toHaveBeenCalledWith('测试系列');
            expect(mockPush).toHaveBeenCalledWith(toSeriesUrl('测试系列'));
        });

        it('点击含中文与特殊字符的系列正常导航', async () => {
            mockStore.list = ['测试 系列', 'A&B'];
            useSeriesStore.mockReturnValue(mockStore);

            wrapper = mount(SeriesPage);

            const rows = wrapper.findAll('.series-row');
            await rows[0].trigger('click');
            await rows[1].trigger('click');

            expect(mockStore.setCurrentSeries).toHaveBeenNthCalledWith(1, '测试 系列');
            expect(mockStore.setCurrentSeries).toHaveBeenNthCalledWith(2, 'A&B');
            expect(mockPush).toHaveBeenNthCalledWith(1, toSeriesUrl('测试 系列'));
            expect(mockPush).toHaveBeenNthCalledWith(2, toSeriesUrl('A&B'));
        });
    });

    describe('错误重试', () => {
        it('错误态显示重试按钮并触发 loadSeries', async () => {
            mockStore.error = '网络错误';
            mockStore.loading = false;
            useSeriesStore.mockReturnValue(mockStore);

            wrapper = mount(SeriesPage);

            expect(wrapper.text()).toContain('加载失败');
            expect(wrapper.find('.error-state').exists()).toBe(true);
            expect(wrapper.find('#retrySeriesBtn').exists()).toBe(true);

            await wrapper.find('#retrySeriesBtn').trigger('click');
            expect(mockStore.loadSeries).toHaveBeenCalled();
        });
    });

    describe('onMounted', () => {
        it('组件挂载时调用 loadSeries', async () => {
            wrapper = mount(SeriesPage);
            expect(mockStore.loadSeries).toHaveBeenCalled();
        });
    });

    describe('保留文案', () => {
        it('显示正确的标题和文案', async () => {
            wrapper = mount(SeriesPage);

            expect(wrapper.find('.mobile-kicker').text()).toBe('Library');
            expect(wrapper.find('h1').text()).toBe('漫画阅读器');
            expect(wrapper.text()).toContain('选择系列，继续进入逐级目录。');
            expect(wrapper.find('#seriesSearch').attributes('placeholder')).toBe('搜索系列');
        });
    });
});