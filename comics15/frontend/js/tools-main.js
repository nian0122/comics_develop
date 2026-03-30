import { toolsApi } from './services/tools-api.js';

class ToolsPage {
    constructor() {
        this.tools = [];
        this.selectedTool = null;
        this.currentExecution = null;
        this.pollInterval = null;
        this.seriesList = [];

        this.elements = {
            toolsList: document.getElementById('toolsList'),
            executionsList: document.getElementById('executionsList'),
            cleanupBtn: document.getElementById('cleanupBtn'),
            toolTitle: document.getElementById('toolTitle'),
            runBtn: document.getElementById('runBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            empty: document.getElementById('empty'),
            configPanel: document.getElementById('configPanel'),
            toolDescription: document.getElementById('toolDescription'),
            paramsForm: document.getElementById('paramsForm'),
            logPanel: document.getElementById('logPanel'),
            statusBadge: document.getElementById('statusBadge'),
            durationText: document.getElementById('durationText'),
            progressStats: document.getElementById('progressStats'),
            logOutput: document.getElementById('logOutput'),
            footerStatus: document.getElementById('footerStatus')
        };
    }

    async init() {
        this.bindEvents();
        await this.loadTools();
        await this.loadExecutions();
        await this.loadSeries();
    }

    bindEvents() {
        this.elements.runBtn.onclick = () => this.executeTool();
        this.elements.cancelBtn.onclick = () => this.cancelExecution();
        this.elements.cleanupBtn.onclick = () => this.cleanupExecutions();
    }

    async loadTools() {
        try {
            this.tools = await toolsApi.getTools();
            this.renderToolsList();
        } catch (error) {
            this.elements.toolsList.innerHTML = '<div class="p-2 text-red-400">加载工具列表失败</div>';
            console.error('Error loading tools:', error);
        }
    }

    async loadSeries() {
        try {
            this.seriesList = await toolsApi.getSeries();
        } catch (error) {
            console.error('Error loading series:', error);
        }
    }

    async loadExecutions() {
        try {
            const executions = await toolsApi.getAllExecutions();
            this.renderExecutionsList(executions);
            this.elements.cleanupBtn.style.display = Object.keys(executions).length > 0 ? 'block' : 'none';
        } catch (error) {
            console.error('Error loading executions:', error);
        }
    }

    renderToolsList() {
        if (this.tools.length === 0) {
            this.elements.toolsList.innerHTML = '<div class="status-text text-center p-4">暂无可用工具</div>';
            return;
        }

        this.elements.toolsList.innerHTML = this.tools.map(tool => `
            <div class="list-item ${this.selectedTool?.name === tool.name ? 'selected' : ''}" 
                 data-tool="${tool.name}">
                <div class="chapter-dot"></div>
                <div class="flex-1">
                    <div class="text-sm font-medium">${tool.displayName}</div>
                    <div class="text-xs text-[var(--text-tertiary)]">${tool.description}</div>
                </div>
            </div>
        `).join('');

        this.elements.toolsList.querySelectorAll('.list-item').forEach(item => {
            item.onclick = () => this.selectTool(item.dataset.tool);
        });
    }

    renderExecutionsList(executions) {
        const entries = Object.entries(executions);
        if (entries.length === 0) {
            this.elements.executionsList.innerHTML = '<div class="status-text text-center p-4">暂无执行记录</div>';
            return;
        }

        this.elements.executionsList.innerHTML = entries.map(([id, exec]) => {
            const statusColor = this.getStatusColor(exec.status);
            const tool = this.tools.find(t => t.name === exec.toolName);
            return `
                <div class="list-item" data-execution="${id}">
                    <div class="flex-1">
                        <div class="text-sm font-medium">${tool?.displayName || exec.toolName}</div>
                        <div class="text-xs text-[var(--text-tertiary)]">ID: ${id} · ${exec.durationSeconds}秒</div>
                    </div>
                    <div class="px-2 py-1 rounded-full text-xs ${statusColor}">${this.getStatusText(exec.status)}</div>
                </div>
            `;
        }).join('');

        this.elements.executionsList.querySelectorAll('.list-item').forEach(item => {
            item.onclick = () => this.viewExecution(item.dataset.execution);
        });
    }

    getStatusColor(status) {
        const colors = {
            'PENDING': 'bg-gray-100 text-gray-600',
            'RUNNING': 'bg-blue-100 text-blue-600',
            'COMPLETED': 'bg-green-100 text-green-600',
            'FAILED': 'bg-red-100 text-red-600',
            'CANCELLED': 'bg-yellow-100 text-yellow-600'
        };
        return colors[status] || 'bg-gray-100 text-gray-600';
    }

    getStatusText(status) {
        const texts = {
            'PENDING': '等待中',
            'RUNNING': '运行中',
            'COMPLETED': '已完成',
            'FAILED': '失败',
            'CANCELLED': '已取消'
        };
        return texts[status] || status;
    }

    selectTool(toolName) {
        this.selectedTool = this.tools.find(t => t.name === toolName);
        this.renderToolsList();
        this.showConfigPanel();
    }

    showConfigPanel() {
        if (!this.selectedTool) return;

        this.elements.toolTitle.textContent = this.selectedTool.displayName;
        this.elements.toolDescription.textContent = this.selectedTool.description;
        this.elements.empty.style.display = 'none';
        this.elements.configPanel.classList.remove('hidden');
        this.elements.logPanel.classList.add('hidden');
        this.elements.runBtn.style.display = 'inline-flex';
        this.elements.cancelBtn.style.display = 'none';

        this.renderParamsForm();
    }

    renderParamsForm() {
        const params = this.selectedTool.params || [];
        if (params.length === 0) {
            this.elements.paramsForm.innerHTML = '<div class="status-text">此工具无需参数配置</div>';
            return;
        }

        this.elements.paramsForm.innerHTML = params.map(param => {
            if (param.type === 'select' && param.key === 'series') {
                return `
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-[var(--text-secondary)]">${param.label}</label>
                        <select id="param_${param.key}" class="glass-input">
                            <option value="">全部系列</option>
                            ${this.seriesList.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                `;
            }
            if (param.type === 'text') {
                return `
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-[var(--text-secondary)]">${param.label}</label>
                        <input id="param_${param.key}" type="text" class="glass-input" 
                               value="${param.default || ''}" 
                               placeholder="${param.required ? '必填' : '可选'}">
                    </div>
                `;
            }
            if (param.type === 'number') {
                return `
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-[var(--text-secondary)]">${param.label}</label>
                        <input id="param_${param.key}" type="number" class="glass-input" 
                               value="${param.default || ''}" min="1" max="64">
                    </div>
                `;
            }
            return '';
        }).join('');
    }

    async executeTool() {
        if (!this.selectedTool) return;

        const params = {};
        this.selectedTool.params?.forEach(param => {
            const input = document.getElementById(`param_${param.key}`);
            if (input && input.value) {
                params[param.key] = input.value;
            }
        });

        try {
            this.elements.runBtn.disabled = true;
            this.setStatus('正在启动工具执行...');

            const result = await toolsApi.executeTool(this.selectedTool.name, params);
            this.currentExecution = result.executionId;

            this.showLogPanel();
            this.startPolling();

        } catch (error) {
            this.setStatus('执行失败: ' + error.message);
            this.elements.runBtn.disabled = false;
            console.error('Error executing tool:', error);
        }
    }

    showLogPanel() {
        this.elements.configPanel.classList.add('hidden');
        this.elements.logPanel.classList.remove('hidden');
        this.elements.runBtn.style.display = 'none';
        this.elements.cancelBtn.style.display = 'inline-flex';
        this.elements.logOutput.textContent = '';
    }

    startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                const execution = await toolsApi.getExecutionStatus(this.currentExecution);
                if (execution) {
                    this.updateExecutionDisplay(execution);
                    if (execution.isFinished) {
                        this.stopPolling();
                        this.onExecutionComplete(execution);
                    }
                }
            } catch (error) {
                console.error('Error polling status:', error);
            }
        }, 1000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    updateExecutionDisplay(execution) {
        this.elements.statusBadge.className = `px-2 py-1 rounded-full text-xs font-medium ${this.getStatusColor(execution.status)}`;
        this.elements.statusBadge.textContent = this.getStatusText(execution.status);
        this.elements.durationText.textContent = `${execution.durationSeconds}秒`;
        this.elements.progressStats.textContent = `处理: ${execution.processedCount} | 跳过: ${execution.skippedCount} | 失败: ${execution.errorCount}`;
        this.elements.logOutput.textContent = execution.logs?.join('\n') || '';
        this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
    }

    onExecutionComplete(execution) {
        this.elements.cancelBtn.style.display = 'none';
        this.setStatus(`工具执行完成: ${this.getStatusText(execution.status)}`);
        this.loadExecutions();
    }

    async cancelExecution() {
        if (!this.currentExecution) return;

        try {
            await toolsApi.cancelExecution(this.currentExecution);
            this.stopPolling();
            this.setStatus('执行已取消');
            this.showConfigPanel();
            this.loadExecutions();
        } catch (error) {
            this.setStatus('取消失败: ' + error.message);
            console.error('Error canceling execution:', error);
        }
    }

    async viewExecution(executionId) {
        try {
            const execution = await toolsApi.getExecutionStatus(executionId);
            if (execution) {
                this.currentExecution = executionId;
                this.selectedTool = this.tools.find(t => t.name === execution.toolName);
                this.elements.toolTitle.textContent = this.selectedTool?.displayName || execution.toolName;
                this.showLogPanel();
                this.updateExecutionDisplay(execution);
                this.elements.cancelBtn.style.display = execution.isFinished ? 'none' : 'inline-flex';

                if (!execution.isFinished) {
                    this.startPolling();
                }
            }
        } catch (error) {
            console.error('Error viewing execution:', error);
        }
    }

    async cleanupExecutions() {
        try {
            await toolsApi.cleanupExecutions();
            this.loadExecutions();
            this.setStatus('已完成记录已清理');
        } catch (error) {
            this.setStatus('清理失败: ' + error.message);
            console.error('Error cleanup:', error);
        }
    }

    setStatus(message) {
        this.elements.footerStatus.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = new ToolsPage();
    page.init();
});