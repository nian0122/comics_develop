import { createRouter, createWebHistory } from 'vue-router'
import DirectoryPage from '../pages/DirectoryPage.vue'
import ReaderPage from '../pages/ReaderPage.vue'
import SeriesPage from '../pages/SeriesPage.vue'
import ToolsPage from '../pages/ToolsPage.vue'
import { encodeRoutePath, splitRoutePath } from '../utils/route-path.js'

export const routes = [
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

function encodeSeries(seriesName) {
  return encodeURIComponent(seriesName)
}

function encodeOptionalPath(path = '') {
  const normalizedPath = splitRoutePath(path)

  return normalizedPath.length > 0 ? `/${encodeRoutePath(normalizedPath.join('/'))}` : ''
}

export function createSeriesRootRoute(seriesName) {
  return `/series/${encodeSeries(seriesName)}/dir`
}

export function createSeriesDirectoryRoute(seriesName, path = '') {
  return `/series/${encodeSeries(seriesName)}/dir${encodeOptionalPath(path)}`
}

export function createSeriesReadRoute(seriesName, path = '') {
  return `/series/${encodeSeries(seriesName)}/read${encodeOptionalPath(path)}`
}

export function createParentDirectoryRoute(seriesName, path = '') {
  const parts = splitRoutePath(path)

  if (parts.length === 0) {
    return '/'
  }

  if (parts.length === 1) {
    return createSeriesRootRoute(seriesName)
  }

  return createSeriesDirectoryRoute(seriesName, parts.slice(0, -1).join('/'))
}

export function createReaderRoute(seriesName, path = '') {
  return createSeriesReadRoute(seriesName, path)
}
