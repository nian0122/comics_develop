import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SeriesView } from './series-view.js';
import { storage } from '../services/storage.js';

describe('SeriesView', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<section id="seriesView"></section>';
        container = document.querySelector('#seriesView');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('渲染系列列表并展示阅读提示', () => {
        vi.spyOn(storage, 'getSeriesLastReading').mockImplementation((name) => {
            if (name === '测试系列') {
                return { page: 8, totalPages: 20 };
            }
            return null;
        });

        const view = new SeriesView(container);
        view.renderList(['测试系列', 'Another']);

        const rows = container.querySelectorAll('.series-row');
        expect(rows.length).toBe(2);
        expect(container.querySelector('.series-reading-hint')?.textContent).toContain('读到第 8/20 页');
        expect(rows[1].querySelector('.series-reading-hint')).toBeNull();
    });

    it('点击系列时回调原始名称（含中文）', () => {
        vi.spyOn(storage, 'getSeriesLastReading').mockReturnValue(null);
        const onSelectSeries = vi.fn();
        const view = new SeriesView(container, { onSelectSeries });
        view.renderList(['测试 系列', 'A&B']);

        container.querySelector('[data-series="测试 系列"]')?.click();
        container.querySelector('[data-series="A&B"]')?.click();

        expect(onSelectSeries).toHaveBeenNthCalledWith(1, '测试 系列');
        expect(onSelectSeries).toHaveBeenNthCalledWith(2, 'A&B');
    });

    it('搜索输入时仅隐藏不匹配的系列行', () => {
        vi.spyOn(storage, 'getSeriesLastReading').mockReturnValue(null);
        const view = new SeriesView(container);
        view.renderList(['Alpha', 'Beta', '中文系列']);

        const searchEl = container.querySelector('#seriesSearch');
        searchEl.value = 'be';
        searchEl.dispatchEvent(new Event('input'));

        const alpha = container.querySelector('[data-series="Alpha"]');
        const beta = container.querySelector('[data-series="Beta"]');
        const chinese = container.querySelector('[data-series="中文系列"]');
        expect(alpha.hidden).toBe(true);
        expect(beta.hidden).toBe(false);
        expect(chinese.hidden).toBe(true);

        searchEl.value = '  ';
        searchEl.dispatchEvent(new Event('input'));
        expect(alpha.hidden).toBe(false);
        expect(beta.hidden).toBe(false);
        expect(chinese.hidden).toBe(false);
    });

    it('错误态点击重试触发 onRetry 回调', () => {
        const onRetry = vi.fn();
        const view = new SeriesView(container, { onRetry });

        view.renderError();
        container.querySelector('#retrySeriesBtn')?.click();

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('空系列列表时展示空态文案', () => {
        vi.spyOn(storage, 'getSeriesLastReading').mockReturnValue(null);
        const view = new SeriesView(container);

        view.renderList([]);

        expect(container.querySelector('#seriesList .mobile-state-card')?.textContent).toContain('暂无系列');
    });
});
