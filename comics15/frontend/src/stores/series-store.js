// 系列状态管理 - 封装系列加载和当前系列选择逻辑

import { defineStore } from 'pinia';
import { api } from '../services/api.js';
import { storage } from '../services/storage.js';
import { persistence } from '../services/persistence.js';

/**
 * 系列状态管理 store
 * 封装 series list 加载、当前系列选择、最近系列恢复
 */
export const useSeriesStore = defineStore('series', {
    state: () => ({
        /** 系列列表 */
        list: [],
        /** 当前选中的系列名称 */
        current: null,
        /** 加载状态 */
        loading: false,
        /** 错误信息 */
        error: null
    }),

    actions: {
        /**
         * 加载系列列表
         * 调用 api.getSeries() 获取数据
         */
        async loadSeries() {
            console.log('1. 开始加载，loading 设为 true');
            this.loading = true;
            this.error = null;
            try {
                console.log('2. 正在请求 API...');
                const data = await api.getSeries();
                console.log('3. API 响应成功:', data);
                this.list = data.series || [];
                console.log('4. 列表赋值完毕，长度:', this.list.length);
                return this.list;
            } catch (e) {
                this.error = e.message || '获取系列失败';
                throw e;
            } finally {
                this.loading = false;
                console.log('5. 流程结束，loading 设为 false');
            }
        },

        /**
         * 设置当前系列
         * 同步写入 localStorage，保持与 legacy storage.setCurrentSeries 兼容
         * @param {string} name 系列名称
         */
        setCurrentSeries(name) {
            this.current = name;
            if (name) {
                storage.setCurrentSeries(name);
            }
        },

        /**
         * 恢复上次阅读的系列
         * 从 persistence 获取当前系列，若存在则设置为 current
         * @returns {string|null} 恢复的系列名称
         */
        restoreLastSeries() {
            const saved = persistence.getCurrentSeries();
            if (saved) {
                this.current = saved;
            }
            return saved;
        },

        /**
         * 清除当前系列状态
         */
        clearCurrentSeries() {
            this.current = null;
        },

        /**
         * 重置整个 store 状态
         */
        $reset() {
            this.list = [];
            this.current = null;
            this.loading = false;
            this.error = null;
        }
    },

    getters: {
        /**
         * 是否有系列数据
         */
        hasSeries: (state) => state.list.length > 0,

        /**
         * 当前系列索引（在列表中的位置）
         */
        currentSeriesIndex: (state) => {
            if (!state.current) return -1;
            return state.list.findIndex(s => s === state.current);
        }
    }
});