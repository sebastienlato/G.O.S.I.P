import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function hasFireSnapshot() {
  try {
    return (
      JSON.parse(readFileSync('public/data/firms.json', 'utf8')).snapshot !==
      null
    )
  } catch {
    return false
  }
}
export default defineConfig(({ mode }) => ({
  define: {
    __FIRMS_AVAILABLE__: JSON.stringify(
      process.env.GOSIP_TEST_FIRMS === '1' || hasFireSnapshot(),
    ),
  },
  base: mode === 'pages' ? '/G.O.S.I.P/' : '/',
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
                "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.weather.gov; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
            },
            injectTo: 'head-prepend',
          },
        ],
      },
    },
  ],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  test: { include: ['src/**/*.test.ts', 'ingest/**/*.test.ts'] },
}))
