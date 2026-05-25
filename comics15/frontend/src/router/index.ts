import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DirectoryPage from '@/pages/DirectoryPage.vue'
import ReaderPage from '@/pages/ReaderPage.vue'
import SeriesPage from '@/pages/SeriesPage.vue'
import ToolsPage from '@/pages/ToolsPage.vue'
import { encodeRoutePath, splitRoutePath } from '@/utils/route-path'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: SeriesPage
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

export function createSeriesRootRoute(seriesName: string): string {
  return `/series/${encodeSeries(seriesName)}/dir`
}

export function createSeriesDirectoryRoute(seriesName: string, path = ''): string {
  return `/series/${encodeSeries(seriesName)}/dir${encodeOptionalPath(path)}`
}

export function createSeriesReadRoute(seriesName: string, path = ''): string {
  return `/series/${encodeSeries(seriesName)}/read${encodeOptionalPath(path)}`
}

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

export function createReaderRoute(seriesName: string, path = ''): string {
  return createSeriesReadRoute(seriesName, path)
}
