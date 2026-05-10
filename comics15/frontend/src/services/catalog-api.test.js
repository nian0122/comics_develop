import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { catalogApi, ApiError } from './catalog-api.js';

describe('catalogApi', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getLevelNodes', () => {
        it('按后端 { path, nodes } 响应返回节点数组', async () => {
            const nodes = [
                { type: 'chapter', name: '第 1 话', path_id: '第一卷/第 1 话' }
            ];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ path: '第一卷', nodes })
            });

            const result = await catalogApi.getLevelNodes('测试系列', '第一卷');

            expect(result).toEqual(nodes);
            expect(fetch).toHaveBeenCalledWith('/api/levels/%E6%B5%8B%E8%AF%95%E7%B3%BB%E5%88%97?path=%E7%AC%AC%E4%B8%80%E5%8D%B7');
        });

        it('后端未返回 nodes 时使用空数组', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ path: '不存在' })
            });

            await expect(catalogApi.getLevelNodes('测试系列', '不存在')).resolves.toEqual([]);
        });

        it('请求失败时抛出 ApiError', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 404 });

            await expect(catalogApi.getLevelNodes('测试系列')).rejects.toMatchObject({
                name: 'ApiError',
                status: 404
            });
        });
    });
});
