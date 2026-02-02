/**
 * 类型定义文件
 * 包含项目中使用的所有接口和类型
 */

// ============== 基础类型 ==============

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============== API 相关类型 ==============

export interface ChapterInfo {
    path_id: string;
    name: string;
}

export interface ChapterFilesResponse {
    files: string[];
}

export interface SeriesInfo {
    name: string;
    chapterCount?: number;
    lastRead?: string;
}

export interface ReadingProgress {
    series: string;
    chapter: string;
    position: number;
    timestamp: number;
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
    size?: number;
    lastModified?: number;
}

export interface ReaderState {
    currentSeries: string;
    currentChapter: string;
    currentIndex: number;
    scale: number;
    position: number;
}

export interface ReaderSettings {
    scale: number;
    autoPreload: boolean;
    showControls: boolean;
    keyboardShortcuts: boolean;
    doubleClickForHQ: boolean;
}

// ============== UI 相关类型 ==============

export interface UIState {
    headerVisible: boolean;
    footerVisible: boolean;
    sidebarVisible: boolean;
    isMobile: boolean;
    theme: 'light' | 'dark' | 'auto';
}

export interface ViewportSize {
    width: number;
    height: number;
}

export interface ScrollPosition {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}

// ============== 事件相关类型 ==============

export interface BaseEvent {
    type: string;
    timestamp: number;
}

export interface SeriesSelectEvent extends BaseEvent {
    type: 'series:select';
    payload: { name: string };
}

export interface ChapterSelectEvent extends BaseEvent {
    type: 'chapter:select';
    payload: { index: number; chapter: ChapterInfo };
}

export interface ReaderScrollEvent extends BaseEvent {
    type: 'reader:scroll';
    payload: ScrollPosition;
}

export interface ScaleChangeEvent extends BaseEvent {
    type: 'scale:change';
    payload: { value: number };
}

export type AppEvent = SeriesSelectEvent | ChapterSelectEvent | ReaderScrollEvent | ScaleChangeEvent;

// ============== 存储相关类型 ==============

export interface StorageData {
    currentSeries: string;
    currentChapterPathId: string;
    readerScale: number;
    expandedPaths: Record<string, boolean>;
    readerSettings: ReaderSettings;
    uiState: UIState;
    readingProgress: ReadingProgress[];
}

export type StorageKey = keyof StorageData;

// ============== 错误相关类型 ==============

export interface BaseError {
    message: string;
    code?: string;
    timestamp: number;
}

export interface NetworkError extends BaseError {
    type: 'NetworkError';
    statusCode?: number;
    url?: string;
}

export interface ValidationError extends BaseError {
    type: 'ValidationError';
    field?: string;
    value?: any;
}

export interface StorageError extends BaseError {
    type: 'StorageError';
    key?: string;
    operation?: 'get' | 'set' | 'remove';
}

export type AppError = NetworkError | ValidationError | StorageError;

// ============== 组件 Props 类型 ==============

export interface ReaderProps {
    files: string[];
    loadedCount: number;
    scale: number;
    hasChapter: boolean;
    series?: string;
    chapter?: string;
}

export interface SidebarProps {
    series: string[];
    chapterTree: ChapterNode[];
    currentSeries: string;
    currentIndex: number;
    filterText: string;
    expandedPaths: Record<string, boolean>;
    sidebarVisible: boolean;
    isMobile: boolean;
}

export interface HeaderBarProps {
    seriesTitle: string;
    chapterTitle: string;
    scale: number;
    canPrev: boolean;
    canNext: boolean;
    headerVisible: boolean;
}

export interface FooterBarProps {
    status: string;
    loadedCount: number;
    totalCount: number;
    footerVisible: boolean;
}

// ============== 组件 Emits 类型 ==============

export interface ReaderEmits {
    scroll: [data: ScrollPosition];
    'load-more': [];
    'image-double-click': [imgElement: HTMLImageElement];
}

export interface SidebarEmits {
    'select-series': [name: string];
    'select-chapter': [index: number];
    'update:filter-text': [text: string];
    'toggle-volume': [fullPath: string];
}

export interface HeaderBarEmits {
    'prev-chapter': [];
    'next-chapter': [];
    'scroll-top': [];
    'update:scale': [value: number];
}

// ============== 工具类型 ==============

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

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

// ============== 类型守卫函数 ==============

export function isChapterNode(item: any): item is ChapterNode {
    return (
        item &&
        typeof item === 'object' &&
        typeof item.name === 'string' &&
        typeof item.fullPath === 'string' &&
        Array.isArray(item.children) &&
        typeof item.isChapter === 'boolean'
    );
}

export function isReaderFile(item: any): item is ReaderFile {
    return (
        item &&
        typeof item === 'object' &&
        typeof item.filename === 'string' &&
        ['image', 'video', 'unknown'].includes(item.type) &&
        typeof item.url === 'string'
    );
}

export function isAppError(error: any): error is AppError {
    return (
        error &&
        typeof error === 'object' &&
        typeof error.message === 'string' &&
        typeof error.timestamp === 'number' &&
        ['NetworkError', 'ValidationError', 'StorageError'].includes(error.type)
    );
}

// ============== 类型断言函数 ==============

export function assertIsChapterNode(item: any): asserts item is ChapterNode {
    if (!isChapterNode(item)) {
        throw new Error('Expected ChapterNode');
    }
}

export function assertIsReaderFile(item: any): asserts item is ReaderFile {
    if (!isReaderFile(item)) {
        throw new Error('Expected ReaderFile');
    }
}

export function assertIsAppError(error: any): asserts error is AppError {
    if (!isAppError(error)) {
        throw new Error('Expected AppError');
    }
}