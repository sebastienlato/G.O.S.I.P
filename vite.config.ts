import { decodeOoni } from './src/data/ooni.ts'
import { decodeFIRMS } from './src/data/firms.ts'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function hasFireSnapshot() {
  try {
    return (
      decodeFIRMS(readFileSync('public/data/firms.json', 'utf8'), Date.now())
        .snapshot !== null
    )
  } catch {
    return false
  }
}
function hasOoniSnapshot() {
  try {
    return (
      decodeOoni(readFileSync('public/data/ooni.json', 'utf8'), Date.now())
        .snapshot !== null
    )
  } catch {
    return false
  }
}
// Globe imagery/terrain hosts the visitor's browser may contact (D52).
const imageryHosts = [
  'https://gibs.earthdata.nasa.gov',
  'https://api.cesium.com',
  'https://assets.ion.cesium.com',
  'https://assets.cesium.com',
  'https://*.virtualearth.net',
  'https://tile.googleapis.com',
].join(' ')
export default defineConfig(({ mode }) => ({
  define: {
    __OONI_AVAILABLE__: JSON.stringify(
      process.env.GOSIP_TEST_OONI === '1' || hasOoniSnapshot(),
    ),
    __FIRMS_AVAILABLE__: JSON.stringify(
      process.env.GOSIP_TEST_FIRMS === '1' || hasFireSnapshot(),
    ),
  },
  base: mode === 'pages' ? '/G.O.S.I.P/' : '/',
  // Never inline assets as data: URLs; the CSP only allows same-origin fonts.
  build: { assetsInlineLimit: 0 },
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
              content: `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${imageryHosts}; font-src 'self'; connect-src 'self' https://api.weather.gov ${imageryHosts}; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'`,
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
