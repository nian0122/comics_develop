import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { localMediaDevPlugin } from './local-media-dev-server.js'

export default defineConfig({
  plugins: [vue(), localMediaDevPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:500',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
})
