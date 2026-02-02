/**
 * 对应原 HTML 逻辑块:
 * - preloadNextBatch(): 预加载下一批图片
 * - preloadNextChapterMetadata(): 预加载下一章元数据
 * - clearPreloader(): 清理预加载容器
 * - 预加载容器 DOM 操作
 * - 常量: PRELOAD_SIZE
 *
 * 职责: 资源预加载算法（图片预加载、下一章元数据预加载）
 */

import {ref, computed} from 'vue';
import {comicApi} from '@/api/comicApi';
import {CONSTANTS, isImageFile, buildImageUrl, type ChapterInfo} from '@/types';

export interface UsePreloadReturn {
    preloaderContainer: ReturnType<typeof ref<HTMLDivElement | null>>;
    nextChapterFilesCache: ReturnType<typeof ref<string[] | null>>;
    nextChapterIndex: ReturnType<typeof ref<number>>;
    preloadNextBatch: (startIndex: number, currentSeries: string, pathId: string, allFiles: string[]) => void;
    preloadNextChapterMeta: (
        currentIndex: number,
        flatChapters: ChapterInfo[],
        currentSeries: string
    ) => Promise<void>;
    clearPreloader: () => void;
    setPreloaderContainer: (el: HTMLDivElement | null) => void;
}

export function usePreload(): UsePreloadReturn {
    // ============== State ==============
    const preloaderContainer = ref<HTMLDivElement | null>(null);
    const nextChapterFilesCache = ref<string[] | null>(null);
    const nextChapterIndex = ref<number>(-1);

    // ============== Actions ==============

    /**
     * 设置预加载容器
     */
    function setPreloaderContainer(el: HTMLDivElement | null): void {
        preloaderContainer.value = el;
    }

    /**
     * 清理预加载容器
     * 对应原 HTML: function clearPreloader()
     */
    function clearPreloader(): void {
        if (preloaderContainer.value) {
            preloaderContainer.value.innerHTML = '';
        }
        console.log('[usePreload] Cleared preloader');
    }

    /**
     * 预加载下一批图片
     * 对应原 HTML: function preloadNextBatch(startIndex, count)
     */
    function preloadNextBatch(
        startIndex: number,
        currentSeries: string,
        pathId: string,
        allFiles: string[]
    ): void {
        clearPreloader();

        const endIndex = Math.min(startIndex + CONSTANTS.PRELOAD_SIZE, allFiles.length);
        const filesToPreload = allFiles.slice(startIndex, endIndex);

        if (filesToPreload.length === 0) {
            return;
        }

        console.log(`[usePreload] Preloading ${filesToPreload.length} files from index ${startIndex}`);

        filesToPreload.forEach((filename) => {
            // 仅预加载图片，视频文件太大不适合这种方式
            if (isImageFile(filename) && preloaderContainer.value) {
                const fileUrl = buildImageUrl(currentSeries, pathId, filename);

                // 使用隐藏的 <img> 标签触发下载
                const img = document.createElement('img');
                img.src = fileUrl;
                img.loading = 'eager';
                img.style.width = '1px';
                img.style.height = '1px';
                img.style.position = 'absolute';
                img.style.opacity = '0';

                preloaderContainer.value.appendChild(img);
            }
        });
    }

    /**
     * 预加载下一章元数据
     * 对应原 HTML: async function preloadNextChapterMetadata()
     */
    async function preloadNextChapterMeta(
        currentIdx: number,
        flatChapters: ChapterInfo[],
        currentSeries: string
    ): Promise<void> {
        nextChapterIndex.value = currentIdx + 1;

        if (nextChapterIndex.value >= flatChapters.length) {
            nextChapterFilesCache.value = null;
            console.log('[usePreload] No next chapter to preload');
            return;
        }

        const chapterData = flatChapters[nextChapterIndex.value];
        const {path_id} = chapterData;

        console.log(`[usePreload] Preloading metadata for next chapter: ${chapterData.name}`);

        try {
            const data = await comicApi.getFiles(
                currentSeries,
                path_id,
                1,
                CONSTANTS.MAX_IMAGES_TO_FETCH
            );

            nextChapterFilesCache.value = data.files || [];
            console.log(`[usePreload] Next chapter metadata loaded: ${data.files?.length || 0} files cached`);
        } catch (err) {
            nextChapterFilesCache.value = null;
            console.error('[usePreload] Error preloading next chapter metadata:', err);
        }
    }

    return {
        preloaderContainer: computed(() => preloaderContainer.value),
        nextChapterFilesCache: computed(() => nextChapterFilesCache.value),
        nextChapterIndex: computed(() => nextChapterIndex.value),
        preloadNextBatch,
        preloadNextChapterMeta,
        clearPreloader,
        setPreloaderContainer,
    };
}
