import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/amber-works/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '个人工作档期台账',
        short_name: '档期台账',
        description: '仅供个人使用的本地工作档期 PWA',
        theme_color: '#2563eb',
        background_color: '#f6f8fb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/amber-works/',
        start_url: '/amber-works/',
        icons: [
          {
            src: '/amber-works/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
