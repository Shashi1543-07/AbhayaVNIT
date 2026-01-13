import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Disable auto-registration to avoid path issues
      includeAssets: ['logo.png', 'vite.svg'],
      manifest: {
        name: "VNIT Girls' Safety App",
        short_name: 'VNIT Safety',
        description: 'Campus Safety & Wellness System',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: [], // Empty patterns to skip service worker generation
        skipWaiting: false
      },
      disable: true // Disable PWA features during build to avoid apostrophe path issues
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
