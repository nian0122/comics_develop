import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_COMICS_ROOT = 'F:/games/comics'
const DEFAULT_HQ_SUB_DIR = 'h_photograph'
const DEFAULT_LQ_SUB_DIR = 'l_photograph'

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime'
}

function normalizeRelativeUrl(url, prefix) {
  const rawPath = String(url).split('?')[0]
  const encodedRelativePath = rawPath.slice(prefix.length)
  const relativePath = decodeURIComponent(encodedRelativePath)

  return relativePath.split('/').filter(Boolean).join(path.sep)
}

export function createLocalMediaResolver(env = process.env) {
  const comicsRoot = path.resolve(env.COMICS_ROOT_DIR ?? DEFAULT_COMICS_ROOT)
  const hqRoot = path.resolve(comicsRoot, env.HQ_SUB_DIR ?? DEFAULT_HQ_SUB_DIR)
  const lqRoot = path.resolve(comicsRoot, env.LQ_SUB_DIR ?? DEFAULT_LQ_SUB_DIR)

  return function resolveLocalMedia(url = '') {
    const mappings = [
      { prefix: '/hq_image/', root: hqRoot, missingStatus: 404 },
      { prefix: '/lq_image/', root: lqRoot, missingStatus: 204 },
      { prefix: '/video/', root: hqRoot, missingStatus: 404 }
    ]
    const mapping = mappings.find((item) => url.startsWith(item.prefix))

    if (!mapping) {
      return null
    }

    const relativePath = normalizeRelativeUrl(url, mapping.prefix)

    if (relativePath.split(path.sep).includes('..')) {
      return { status: 403 }
    }

    const absolutePath = path.resolve(mapping.root, relativePath)

    if (!absolutePath.startsWith(mapping.root + path.sep) && absolutePath !== mapping.root) {
      return { status: 403 }
    }

    return {
      path: absolutePath,
      missingStatus: mapping.missingStatus,
      contentType: MIME_TYPES[path.extname(absolutePath).toLowerCase()] ?? 'application/octet-stream'
    }
  }
}

export function localMediaDevPlugin(env = process.env) {
  const resolveLocalMedia = createLocalMediaResolver(env)

  return {
    name: 'comic-local-media-dev-server',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const resolved = resolveLocalMedia(request.url ?? '')

        if (!resolved) {
          next()
          return
        }

        if (resolved.status === 403) {
          response.statusCode = 403
          response.end('Forbidden')
          return
        }

        if (!fs.existsSync(resolved.path) || !fs.statSync(resolved.path).isFile()) {
          response.statusCode = resolved.missingStatus
          response.end()
          return
        }

        response.setHeader('Content-Type', resolved.contentType)
        response.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(resolved.path).pipe(response)
      })
    }
  }
}

export const __filename = fileURLToPath(import.meta.url)
