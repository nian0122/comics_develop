/**
 * 对应原 HTML 逻辑块: 所有 fetch() 调用
 * - loadSeries() 中的 fetch('/series')
 * - fetchAndRenderChapters() 中的 fetch(`/api/chapters/${encodeURIComponent(name)}`)
 * - loadAllImageFilenamesAndRender() 中的 fetch(chapterUrl)
 * - preloadNextChapterMetadata() 中的 fetch(chapterUrl)
 *
 * 职责: 封装 Axios 请求，提供类型安全的 API 调用
 */

import axios from 'axios';
import type { ChapterInfo, ChapterFilesResponse } from '@/types';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

/**
 * 漫画 API 接口
 */
export const comicApi = {
  /**
   * 获取所有漫画系列
   * GET /api/series -> string[]
   * 对应原 HTML: fetch('/series')
   */
  async getSeries(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/api/series');
    return response.data;
  },

  /**
   * 获取指定系列的章节列表（扁平）
   * GET /api/chapters/{seriesName} -> [{ path_id: string, name: string }]
   * 对应原 HTML: fetch(`/api/chapters/${encodeURIComponent(name)}`)
   */
  async getChapters(seriesName: string): Promise<ChapterInfo[]> {
    const response = await apiClient.get<ChapterInfo[]>(
      `/api/chapters/${encodeURIComponent(seriesName)}`
    );
    return response.data;
  },

  /**
   * 获取指定章节的文件列表
   * GET /api/chapter/{seriesName}/{path_id}?page=1&per_page=500 -> { files: string[] }
   * 对应原 HTML: fetch(`/api/chapter/${encodeURIComponent(seriesName)}/${encodeURIComponent(path_id)}?page=1&per_page=${MAX_IMAGES_TO_FETCH}`)
   */
  async getFiles(
    seriesName: string,
    pathId: string,
    page: number = 1,
    perPage: number = 500
  ): Promise<ChapterFilesResponse> {
    const response = await apiClient.get<ChapterFilesResponse>(
      `/api/chapter/${encodeURIComponent(seriesName)}/${encodeURIComponent(pathId)}`,
      {
        params: {
          page,
          per_page: perPage,
        },
      }
    );
    return response.data;
  },
};

export default apiClient;
