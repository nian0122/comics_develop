/**
 * 类型定义文件
 * 包含项目中使用的所有接口和类型
 */

// ============== API 相关类型 ==============

export interface ChapterInfo {
    path_id: string;
    name: string;
}

export interface ChapterFilesResponse {
    files: string[];
}

// ============== 章节树相关类型 ==============

export interface ChapterNode {
    name: string;
    fullPath: string;
    children: ChapterNode[];
    isChapter: boolean;
    flatIndex: number | null;
    path_id: string | null;
    isExpanded: boolean;
}

// ============== 阅读器相关类型 ==============

export type FileType = 'image' | 'video' | 'unknown';

export interface ReaderFile {
    filename: string;
    type: FileType;
    url: string;
}

// ============== 常量定义 ==============

export const CONSTANTS = {
    FRONT_END_PAGE_SIZE: 5,
    PRELOAD_SIZE: 5,
    MAX_IMAGES_TO_FETCH: 500,
    SCROLL_DIRECTION_THRESHOLD: 50,
    SCROLL_LOAD_THRESHOLD: 300,
    DOUBLE_CLICK_TIME_THRESHOLD: 300,
} as const;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const VIDEO_EXTENSIONS = ['.mp4', '.mov'] as const;

// ============== 文件类型判断函数 ==============

export function isImageFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
}

export function isVideoFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
}

export function getFileType(filename: string): FileType {
    if (isImageFile(filename)) return 'image';
    if (isVideoFile(filename)) return 'video';
    return 'unknown';
}

// ============== URL 构建函数 ==============

export function buildImageUrl(
    series: string,
    chapter: string,
    filename: string,
    hq: boolean = false
): string {
    const prefix = hq ? '/hq_image' : '/image';
    return `${prefix}/${encodeURIComponent(series)}/${encodeURIComponent(chapter)}/${encodeURIComponent(filename)}`;
}

export function buildVideoUrl(series: string, chapter: string, filename: string): string {
    return `/video/${encodeURIComponent(series)}/${encodeURIComponent(chapter)}/${encodeURIComponent(filename)}`;
}

// ============== 自然排序辅助函数 ==============

export function naturalSort(text: string): (string | number)[] {
    return text.split(/(\d+)/).map((c) => {
        const num = parseInt(c, 10);
        return isNaN(num) ? c : num;
    });
}
