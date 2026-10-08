import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'production-content-policy',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: () => [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content:
                "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://earthquake.usgs.gov https://api.weather.gov; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
            },
            injectTo: 'head-prepend',
          },
        ],
      },
    },
  ],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  test: { include: ['src/**/*.test.ts'] },
})
