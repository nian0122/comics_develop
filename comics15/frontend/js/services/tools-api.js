import { api } from './api.js';

export class ToolsApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ToolsApiError';
        this.status = status;
    }
}

export const toolsApi = {
    async getTools() {
        const res = await fetch('/api/tools');
        if (!res.ok) throw new ToolsApiError('获取工具列表失败', res.status);
        return res.json();
    },

    async executeTool(toolName, params = {}) {
        const res = await fetch(`/api/tools/${encodeURIComponent(toolName)}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new ToolsApiError('执行工具失败', res.status);
        return res.json();
    },

    async getExecutionStatus(executionId) {
        const res = await fetch(`/api/tools/status/${encodeURIComponent(executionId)}`);
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new ToolsApiError('获取执行状态失败', res.status);
        }
        return res.json();
    },

    async getAllExecutions() {
        const res = await fetch('/api/tools/executions');
        if (!res.ok) throw new ToolsApiError('获取执行列表失败', res.status);
        return res.json();
    },

    async cancelExecution(executionId) {
        const res = await fetch(`/api/tools/cancel/${encodeURIComponent(executionId)}`, {
            method: 'POST'
        });
        if (!res.ok) throw new ToolsApiError('取消执行失败', res.status);
        return res.json();
    },

    async cleanupExecutions() {
        const res = await fetch('/api/tools/cleanup', {
            method: 'POST'
        });
        if (!res.ok) throw new ToolsApiError('清理执行记录失败', res.status);
        return res.json();
    },

    async getSeries() {
        try {
            return await api.getSeries();
        } catch (error) {
            throw new ToolsApiError('获取系列列表失败', error.status);
        }
    },

    async getChapters(seriesName) {
        try {
            return await api.getChapters(seriesName);
        } catch (error) {
            throw new ToolsApiError('获取章节列表失败', error.status);
        }
    }
};