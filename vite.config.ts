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
      includeAssets: [
        'favicon.ico',
        'kang-studio-favicon-64.png',
        'apple-touch-icon.png',
        'kang-studio-icon-192.png',
        'kang-studio-icon-512.png',
        'kang-studio-icon-transparent.png',
        'appointment-confirmation-bg.png',
        'appointment-confirmation-bg1.png',
        'appointment-person.png',
      ],
      manifest: {
        name: '个人工作档期台账',
        short_name: 'KANG STUDIO',
        description: '仅供个人使用的本地工作档期 PWA',
        theme_color: '#fff8f8',
        background_color: '#fff8f8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/amber-works/',
        start_url: '/amber-works/',
        icons: [
          {
            src: '/amber-works/kang-studio-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/amber-works/kang-studio-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
