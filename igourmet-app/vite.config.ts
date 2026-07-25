import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // bản mới tự tiếp quản ở lần tải lại kế tiếp
      // Tự sinh icon 64/192/512 + maskable + apple-touch-icon (xem pwa-assets.config.ts)
      pwaAssets: { config: true },
      manifest: {
        name: 'iGourmet',
        short_name: 'iGourmet',
        description: 'Đặt bàn & tích điểm iGourmet',
        lang: 'vi',
        theme_color: '#d97706',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
      },
      // CHỈ precache asset tĩnh cùng origin; KHÔNG cache API (backend ở origin khác).
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
