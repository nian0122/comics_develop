import { createRouter, createWebHistory } from 'vue-router';

/**
 * 规范化路径并分段编码。
 * Windows 反斜杠转为斜杠，每段独立编码，斜杠本身不编码为 %2F。
 */
export function encodePathSegments(path) {
    return (path || '')
        .replaceAll(String.fromCharCode(92), '/')
        .split('/')
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

export function toSeriesListUrl() {
    return '/';
}

export function toSeriesUrl(series) {
    return `/series/${encodeURIComponent(series)}`;
}

export function toDirectoryUrl(series, path = '') {
    const encodedPath = encodePathSegments(path);
    const base = toSeriesUrl(series);
    return encodedPath ? `${base}/dir/${encodedPath}` : base;
}

export function toReaderUrl(series, chapterPath) {
    return `${toSeriesUrl(series)}/read/${encodePathSegments(chapterPath)}`;
}

export const routes = [
    {
        path: '/',
        name: 'seriesList',
        component: () => import('../pages/SeriesPage.vue')
    },
    {
        path: '/series/:series',
        name: 'directory',
        component: () => import('../pages/DirectoryPage.vue')
    },
    {
        path: '/series/:series/dir/:path(.*)',
        name: 'directoryNested',
        component: () => import('../pages/DirectoryPage.vue')
    },
    {
        path: '/series/:series/read/:path(.*)',
        name: 'reader',
        component: () => import('../pages/ReaderPage.vue')
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});