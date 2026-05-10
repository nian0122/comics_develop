import { defineStore } from 'pinia';
import { toolsApi } from '../services/tools-api.js';

export const useToolsStore = defineStore('tools', {
    state: () => ({
        tools: [],
        selectedTool: null,
        seriesList: [],
        executions: {},
        currentExecution: null,
        pollingTimer: null,
        loading: false,
        error: null
    }),

    getters: {
        hasRunningExecution: (state) => {
            return state.currentExecution?.status === 'running';
        },
        executionHistory: (state) => {
            return Object.values(state.executions).sort(
                (a, b) => new Date(b.startTime) - new Date(a.startTime)
            );
        }
    },

    actions: {
        async loadTools() {
            this.loading = true;
            this.error = null;
            try {
                this.tools = await toolsApi.getTools();
            } catch (err) {
                this.error = '加载工具列表失败';
                console.error(err);
            } finally {
                this.loading = false;
            }
        },

        selectTool(tool) {
            this.selectedTool = tool;
        },

        async loadSeries() {
            try {
                this.seriesList = await toolsApi.getSeries();
            } catch (err) {
                console.error('加载系列列表失败:', err);
            }
        },

        async executeTool(params) {
            if (!this.selectedTool) return;

            try {
                const result = await toolsApi.executeTool(this.selectedTool.id, params);
                this.currentExecution = {
                    id: result.executionId,
                    status: 'running',
                    startTime: new Date().toISOString(),
                    logs: [],
                    toolName: this.selectedTool.name
                };
                this.startPolling(result.executionId);
            } catch (err) {
                console.error('执行工具失败:', err);
                this.error = '执行工具失败';
            }
        },

        startPolling(executionId) {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
            }

            this.pollingTimer = setInterval(async () => {
                await this.pollExecution(executionId);
            }, 1000);
        },

        async pollExecution(executionId) {
            try {
                const status = await toolsApi.getExecutionStatus(executionId);
                if (!status) {
                    this.stopPolling();
                    return;
                }

                this.currentExecution = {
                    ...this.currentExecution,
                    ...status,
                    toolName: this.currentExecution?.toolName || status.toolName
                };

                this.executions[executionId] = { ...this.currentExecution };

                if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
                    this.stopPolling();
                }
            } catch (err) {
                console.error('轮询执行状态失败:', err);
            }
        },

        stopPolling() {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
                this.pollingTimer = null;
            }
        },

        async cancelExecution() {
            if (!this.currentExecution?.id) return;

            try {
                await toolsApi.cancelExecution(this.currentExecution.id);
                this.currentExecution.status = 'cancelled';
                this.stopPolling();
            } catch (err) {
                console.error('取消执行失败:', err);
            }
        },

        async loadExecutions() {
            try {
                const executions = await toolsApi.getAllExecutions();
                this.executions = executions || {};
            } catch (err) {
                console.error('加载执行历史失败:', err);
            }
        },

        async cleanupExecutions() {
            try {
                await toolsApi.cleanupExecutions();
                this.executions = {};
                this.currentExecution = null;
            } catch (err) {
                console.error('清理执行历史失败:', err);
            }
        },

        clearError() {
            this.error = null;
        }
    }
});
