// 服务模块统一导出

export { catalogApi, ApiError } from './catalog-api.js';
export { mediaUrl } from './media-url.js';
export * from './storage.js';
export * from './tools-api.js';
export * from './persistence.js';
export { ChapterMetaCache } from './chapter-meta-cache.js';

// 兼容旧导入
import { catalogApi } from './catalog-api.js';
import { mediaUrl } from './media-url.js';

export const api = {
    ...catalogApi,
    ...mediaUrl,
};
