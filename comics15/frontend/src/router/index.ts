import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DirectoryPage from '@/pages/DirectoryPage.vue'
import ReaderPage from '@/pages/ReaderPage.vue'
import WaterfallPage from '@/pages/WaterfallPage.vue'
import ToolsPage from '@/pages/ToolsPage.vue'
import { encodeRoutePath, splitRoutePath } from '@/utils/route-path'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: WaterfallPage
  },
  {
    path: '/series/:series/dir/:pathMatch(.*)*',
    name: 'series-directory',
    component: DirectoryPage
  },
  {
    path: '/series/:series/read/:pathMatch(.*)*',
    name: 'series-reader',
    component: ReaderPage
  },
  {
    path: '/tools',
    name: 'tools',
    component: ToolsPage
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

function encodeSeries(seriesName: string): string {
  return encodeURIComponent(seriesName)
}

function encodeOptionalPath(path = ''): string {
  const normalizedPath = splitRoutePath(path)

  return normalizedPath.length > 0 ? `/${encodeRoutePath(normalizedPath.join('/'))}` : ''
}

/** 构造某个系列的根目录路由，中文自动编码 */
export function createSeriesRootRoute(seriesName: string): string {
  return `/series/${encodeSeries(seriesName)}/dir`
}

/** 构造指定层级路径的目录路由，中文逐段编码 */
export function createSeriesDirectoryRoute(seriesName: string, path = ''): string {
  return `/series/${encodeSeries(seriesName)}/dir${encodeOptionalPath(path)}`
}

/** 构造某个章节的阅读路由 */
export function createSeriesReadRoute(seriesName: string, path = ''): string {
  return `/series/${encodeSeries(seriesName)}/read${encodeOptionalPath(path)}`
}

/**
 * 返回当前路径的上一级目录路由。
 * 路径为空 → 返回首页 `/`；单层路径 → 返回系列根目录；否则去掉最后一级。
 */
export function createParentDirectoryRoute(seriesName: string, path = ''): string {
  const parts = splitRoutePath(path)

  if (parts.length === 0) {
    return '/'
  }

  if (parts.length === 1) {
    return createSeriesRootRoute(seriesName)
  }

  return createSeriesDirectoryRoute(seriesName, parts.slice(0, -1).join('/'))
}

