/**
 * - loadSeries(): 加载系列列表
 * - renderSeries(): 渲染系列列表
 * - selectSeries(): 选择系列
 * - localStorage 系列保存/恢复
 *
 * 职责: 管理系列列表的获取、当前选择状态
 */

import {ref, computed} from 'vue';
import {comicApi} from '@/api/comicApi';

export interface UseSeriesReturn {
    series: ReturnType<typeof ref<string[]>>;
    currentSeries: ReturnType<typeof ref<string>>;
    loading: ReturnType<typeof ref<boolean>>;
    error: ReturnType<typeof ref<string | null>>;
    loadSeries: () => Promise<void>;
    selectSeries: (name: string) => Promise<void>;
}

export function useSeries(): UseSeriesReturn {
    // ============== State ==============
    const series = ref<string[]>([]);
    const currentSeries = ref<string>('');
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);

    // ============== Actions ==============

    /**
     * 加载系列列表
     * 对应原 HTML: async function loadSeries()
     */
    async function loadSeries(): Promise<void> {
        loading.value = true;
        error.value = null;

        try {
            const data = await comicApi.getSeries();
            series.value = data;
            console.log(`[useSeries] Loaded ${data.length} series`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '未知错误';
            error.value = `无法连接到后端或加载系列列表: ${errorMsg}`;
            series.value = [];
            console.error('[useSeries] Error loading series:', err);
        } finally {
            loading.value = false;
        }
    }

    /**
     * 选择系列
     * 对应原 HTML: async function selectSeries(name)
     */
    async function selectSeries(name: string): Promise<void> {
        if (currentSeries.value === name) return;

        currentSeries.value = name;

        // 保存到 localStorage
        localStorage.setItem('currentSeries', name);

        console.log(`[useSeries] Selected series: ${name}`);
    }

    return {
        series: computed(() => series.value),
        currentSeries: computed({
            get: () => currentSeries.value,
            set: (val) => {
                currentSeries.value = val;
            },
        }),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        loadSeries,
        selectSeries,
    };
}
