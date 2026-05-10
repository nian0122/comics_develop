import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useToolsStore } from './tools-store.js';

vi.mock('../services/tools-api.js', () => ({
    toolsApi: {
        getTools: vi.fn(),
        executeTool: vi.fn(),
        getExecutionStatus: vi.fn(),
        getAllExecutions: vi.fn(),
        cancelExecution: vi.fn(),
        cleanupExecutions: vi.fn(),
        getSeries: vi.fn()
    }
}));

import { toolsApi } from '../services/tools-api.js';

describe('tools-store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('loadTools', () => {
        it('加载工具列表并设置 state', async () => {
            const mockTools = [
                { name: 'image-optimizer', displayName: '图片优化器', params: [] }
            ];
            toolsApi.getTools.mockResolvedValue(mockTools);

            const store = useToolsStore();
            await store.loadTools();

            expect(store.tools).toEqual(mockTools);
            expect(store.loading).toBe(false);
        });
    });

    describe('executeTool', () => {
        it('使用 tool.name 作为执行路径参数', async () => {
            const mockTool = { name: 'image-optimizer', displayName: '图片优化器', params: [] };
            toolsApi.executeTool.mockResolvedValue({ executionId: 'exec-123', toolName: 'image-optimizer' });

            const store = useToolsStore();
            store.selectedTool = mockTool;
            await store.executeTool({ series: '测试系列' });

            expect(toolsApi.executeTool).toHaveBeenCalledWith('image-optimizer', { series: '测试系列' });
            expect(store.currentExecution.id).toBe('exec-123');
        });
    });

    describe('pollExecution 状态映射', () => {
        it('将后端 RUNNING 状态映射为前端 running', async () => {
            const backendStatus = {
                executionId: 'exec-123',
                status: 'RUNNING',
                logs: ['处理文件 1', '处理文件 2'],
                processedCount: 10
            };
            toolsApi.getExecutionStatus.mockResolvedValue(backendStatus);

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123', toolName: 'image-optimizer' };
            await store.pollExecution('exec-123');

            expect(store.currentExecution.status).toBe('running');
        });

        it('将后端 FAILED 状态映射为前端 error', async () => {
            const backendStatus = {
                executionId: 'exec-123',
                status: 'FAILED',
                logs: ['错误: 文件不存在'],
                processedCount: 5
            };
            toolsApi.getExecutionStatus.mockResolvedValue(backendStatus);

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123', toolName: 'image-optimizer' };
            await store.pollExecution('exec-123');

            expect(store.currentExecution.status).toBe('error');
        });

        it('将后端 COMPLETED 状态映射为前端 completed', async () => {
            const backendStatus = {
                executionId: 'exec-123',
                status: 'COMPLETED',
                logs: ['完成'],
                processedCount: 100
            };
            toolsApi.getExecutionStatus.mockResolvedValue(backendStatus);

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123', toolName: 'image-optimizer' };
            await store.pollExecution('exec-123');

            expect(store.currentExecution.status).toBe('completed');
        });

        it('将后端 CANCELLED 状态映射为前端 cancelled', async () => {
            const backendStatus = {
                executionId: 'exec-123',
                status: 'CANCELLED',
                logs: ['已取消'],
                processedCount: 20
            };
            toolsApi.getExecutionStatus.mockResolvedValue(backendStatus);

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123', toolName: 'image-optimizer' };
            await store.pollExecution('exec-123');

            expect(store.currentExecution.status).toBe('cancelled');
        });
    });

    describe('logs 兼容处理', () => {
        it('将后端 string[] 格式转换为 { time, message } 格式', async () => {
            const backendStatus = {
                executionId: 'exec-123',
                status: 'RUNNING',
                logs: ['处理文件 1', '处理文件 2', '错误: 权限不足']
            };
            toolsApi.getExecutionStatus.mockResolvedValue(backendStatus);

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123', toolName: 'image-optimizer' };
            await store.pollExecution('exec-123');

            expect(store.currentExecution.logs).toHaveLength(3);
            expect(store.currentExecution.logs[0]).toHaveProperty('time');
            expect(store.currentExecution.logs[0]).toHaveProperty('message');
            expect(store.currentExecution.logs[0].message).toBe('处理文件 1');
        });

        it('保留现有 { time, message } 格式日志', async () => {
            const backendStatus = {
                executionId: 'exec-123',
                status: 'RUNNING',
                logs: [
                    { time: '2024-01-01T10:00:00', message: '已有日志' }
                ]
            };
            toolsApi.getExecutionStatus.mockResolvedValue(backendStatus);

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123', toolName: 'image-optimizer' };
            await store.pollExecution('exec-123');

            expect(store.currentExecution.logs[0].time).toBe('2024-01-01T10:00:00');
            expect(store.currentExecution.logs[0].message).toBe('已有日志');
        });
    });

    describe('hasRunningExecution getter', () => {
        it('识别 running 状态', () => {
            const store = useToolsStore();
            store.currentExecution = { status: 'running' };

            expect(store.hasRunningExecution).toBe(true);
        });

        it('识别 RUNNING 状态（规范化后）', async () => {
            toolsApi.getExecutionStatus.mockResolvedValue({ status: 'RUNNING', logs: [] });

            const store = useToolsStore();
            store.currentExecution = { id: 'exec-123' };
            await store.pollExecution('exec-123');

            expect(store.hasRunningExecution).toBe(true);
        });

        it('加载执行历史时同样规范化后端状态和字符串日志', async () => {
            toolsApi.getAllExecutions.mockResolvedValue({
                'exec-1': {
                    executionId: 'exec-1',
                    toolName: 'image-optimizer',
                    status: 'FAILED',
                    logs: ['错误: 文件不存在'],
                    startTime: '2026-05-10T10:00:00'
                }
            });

            const store = useToolsStore();
            await store.loadExecutions();

            expect(store.executions['exec-1'].status).toBe('error');
            expect(store.executions['exec-1'].logs[0]).toMatchObject({
                message: '错误: 文件不存在'
            });
        });
    });
});
