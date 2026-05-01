import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api.js';
import { toolsApi, ToolsApiError } from './tools-api.js';

describe('toolsApi', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should return tool list on success', async () => {
        const tools = [{ name: 'image-optimizer' }];
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(tools)
        });

        await expect(toolsApi.getTools()).resolves.toEqual(tools);
        expect(fetch).toHaveBeenCalledWith('/api/tools');
    });

    it('should throw ToolsApiError when tool list request fails', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 500 });

        await expect(toolsApi.getTools()).rejects.toMatchObject({
            name: 'ToolsApiError',
            status: 500
        });
    });

    it('should execute tool with encoded tool name and json body', async () => {
        const response = { executionId: 'run-1' };
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(response)
        });

        await expect(toolsApi.executeTool('图片 优化', { series: '测试' })).resolves.toEqual(response);
        expect(fetch).toHaveBeenCalledWith('/api/tools/%E5%9B%BE%E7%89%87%20%E4%BC%98%E5%8C%96/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ series: '测试' })
        });
    });

    it('should return null for missing execution status', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 404 });

        await expect(toolsApi.getExecutionStatus('missing-id')).resolves.toBeNull();
    });

    it('should cancel execution with encoded execution id', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ cancelled: true })
        });

        await expect(toolsApi.cancelExecution('任务 1')).resolves.toEqual({ cancelled: true });
        expect(fetch).toHaveBeenCalledWith('/api/tools/cancel/%E4%BB%BB%E5%8A%A1%201', {
            method: 'POST'
        });
    });

    it('should cleanup executions with post request', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ removed: 2 })
        });

        await expect(toolsApi.cleanupExecutions()).resolves.toEqual({ removed: 2 });
        expect(fetch).toHaveBeenCalledWith('/api/tools/cleanup', {
            method: 'POST'
        });
    });

    it('should reuse comic api for series list', async () => {
        const getSeriesSpy = vi.spyOn(api, 'getSeries').mockResolvedValue(['Series A']);

        await expect(toolsApi.getSeries()).resolves.toEqual(['Series A']);
        expect(getSeriesSpy).toHaveBeenCalledTimes(1);
    });

    it('should wrap comic api failures for series list with ToolsApiError', async () => {
        vi.spyOn(api, 'getSeries').mockRejectedValue(new Error('network down'));

        await expect(toolsApi.getSeries()).rejects.toBeInstanceOf(ToolsApiError);
        await expect(toolsApi.getSeries()).rejects.toMatchObject({
            message: '获取系列列表失败'
        });
    });

    it('should reuse comic api for encoded chapter lookup', async () => {
        const getChaptersSpy = vi.spyOn(api, 'getChapters').mockResolvedValue(['第 1 话']);

        await expect(toolsApi.getChapters('测试系列')).resolves.toEqual(['第 1 话']);
        expect(getChaptersSpy).toHaveBeenCalledWith('测试系列');
    });
});
