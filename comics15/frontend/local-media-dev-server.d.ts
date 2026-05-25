declare module './local-media-dev-server' {
  import type { Plugin } from 'vite'
  export function localMediaDevPlugin(env?: Record<string, string | undefined>): Plugin
}

export {}
