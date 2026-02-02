/**
 * 对应原 HTML 逻辑块:
 * - openChapter(): 打开章节
 * - loadAllImageFilenamesAndRender(): 加载文件元数据
 * - appendNextImages(): 渲染下一批文件
 * - updateProgressStatus(): 更新进度状态
 * - resetLoadingState(): 重置加载状态
 * - scaleRange 事件监听
 * - prevBtn/nextBtn 事件处理
 * - 常量: FRONT_END_PAGE_SIZE, MAX_IMAGES_TO_FETCH
 *
 * 职责: 核心阅读状态机（图片列表、当前页、缩放、分页加载）
 */

import {ref, computed, type ComputedRef} from 'vue';
import {comicApi} from '@/api/comicApi';
import {CONSTANTS, type ChapterInfo} from '@/types';

export interface UseReaderReturn {
    allChapterFiles: ReturnType<typeof ref<string[]>>;
    imagesLoadedCount: ReturnType<typeof ref<number>>;
    currentIndex: ReturnType<typeof ref<number>>;
    scale: ReturnType<typeof ref<number>>;
    isLoading: ReturnType<typeof ref<boolean>>;
    openChapter: (index: number, flatChapters: ChapterInfo[], currentSeries: string) => Promise<void>;
    appendNextImages: (currentSeries: string, pathId: string) => void;
    resetLoadingState: () => void;
    updateScale: (value: number) => void;
    canPrev: ComputedRef<boolean>;
    canNext: ComputedRef<boolean>;
}

export function useReader(): UseReaderReturn {
    // ============== State ==============
    const allChapterFiles = ref<string[]>([]);
    const imagesLoadedCount = ref<number>(0);
    const currentIndex = ref<number>(-1);
    const scale = ref<number>(100);
    const isLoading = ref<boolean>(false);

    // 从 localStorage 加载缩放设置
    try {
        const savedScale = localStorage.getItem('readerScale');
        if (savedScale) {
            scale.value = parseInt(savedScale, 10);
        }
    } catch {
        scale.value = 100;
    }

    // ============== Computed ==============
    const canPrev = computed(() => currentIndex.value > 0);
    const canNext = computed(() => currentIndex.value >= 0 && allChapterFiles.value.length > 0);

    // ============== Actions ==============

    /**
     * 打开指定章节
     * 对应原 HTML: async function openChapter(idx, isUiSelection = false)
     */
    async function openChapter(
        index: number,
        flatChapters: ChapterInfo[],
        currentSeries: string
    ): Promise<void> {
        if (isLoading.value || index < 0 || index >= flatChapters.length) return;

        currentIndex.value = index;
        const chapterData = flatChapters[index];

        console.log(`[useReader] Opening chapter ${index}: ${chapterData.name}`);

        resetLoadingState();

        // 加载文件元数据
        await loadAllImageFilenamesAndRender(chapterData, currentSeries);
    }

    /**
     * 加载章节文件元数据
     * 对应原 HTML: async function loadAllImageFilenamesAndRender(chapterData)
     */
    async function loadAllImageFilenamesAndRender(
        chapterData: ChapterInfo,
        currentSeries: string
    ): Promise<void> {
        isLoading.value = true;

        const {path_id} = chapterData;

        try {
            const data = await comicApi.getFiles(
                currentSeries,
                path_id,
                1,
                CONSTANTS.MAX_IMAGES_TO_FETCH
            );

            if (!data || !data.files) {
                throw new Error('Invalid API response format or missing files array');
            }

            allChapterFiles.value = data.files;
            console.log(`[useReader] Loaded ${data.files.length} files`);

            // 加载第一批
            appendNextImages(currentSeries, path_id);
        } catch (err) {
            console.error('[useReader] Error loading files metadata:', err);
            allChapterFiles.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * 渲染下一批文件
     * 对应原 HTML: function appendNextImages()
     */
    function appendNextImages(_currentSeries: string, _pathId: string): void {
        if (imagesLoadedCount.value >= allChapterFiles.value.length) {
            return;
        }

        isLoading.value = true;

        const startIndex = imagesLoadedCount.value;
        const endIndex = Math.min(
            startIndex + CONSTANTS.FRONT_END_PAGE_SIZE,
            allChapterFiles.value.length
        );

        console.log(`[useReader] Appending files ${startIndex} to ${endIndex}`);

        imagesLoadedCount.value = endIndex;
        isLoading.value = false;
    }

    /**
     * 重置加载状态
     * 对应原 HTML: function resetLoadingState()
     */
    function resetLoadingState(): void {
        allChapterFiles.value = [];
        imagesLoadedCount.value = 0;
        isLoading.value = false;
        console.log('[useReader] Reset loading state');
    }

    /**
     * 更新缩放比例
     * 对应原 HTML: scaleRange.addEventListener('input', ...)
     */
    function updateScale(value: number): void {
        scale.value = value;
        localStorage.setItem('readerScale', value.toString());
        console.log(`[useReader] Scale updated to ${value}%`);
    }

    return {
        allChapterFiles: computed(() => allChapterFiles.value),
        imagesLoadedCount: computed(() => imagesLoadedCount.value),
        currentIndex: computed(() => currentIndex.value),
        scale: computed(() => scale.value),
        isLoading: computed(() => isLoading.value),
        openChapter,
        appendNextImages,
        resetLoadingState,
        updateScale,
        canPrev,
        canNext,
    };
}