import { defineConfig, devices } from '@playwright/test'
const beta = process.env.BETA_TEST === '1'
export default defineConfig({
  testDir: './tests',
  ...(beta
    ? { testMatch: '**/beta.spec.ts' }
    : { testIgnore: '**/beta.spec.ts' }),
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: beta
      ? 'node scripts/preview-pages.mjs'
      : 'npm run preview -- --port 4173 --strictPort',
    url: `http://127.0.0.1:4173${beta ? '/G.O.S.I.P/' : '/'}`,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
})
