import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { Miniflare } from 'miniflare'
const script = await readFile(new URL('./worker.mjs', import.meta.url), 'utf8')
const releaseURL = 'https://sebastienlato.github.io/G.O.S.I.P/release.json'
const dispatchURL =
  'https://api.github.com/repos/sebastienlato/G.O.S.I.P/actions/workflows/publish-live.yml/dispatches'
// Pinned stable workerd's newest supported API date. Production is 2026-10-10;
// this smoke catches startup/export and edge fetch API failures missed by Node.
it.each(['due', 'recent', 'release-redirect', 'dispatch-redirect'])(
  'actual Workers runtime: %s, bounded requests and no redirected credential',
  async (mode) => {
    const requests = []
    const mf = new Miniflare({
      modules: true,
      script,
      compatibilityDate: '2026-08-06',
      bindings: {
        GITHUB_DISPATCH_TOKEN: 'test-only',
        TOKEN_EXPIRES_AT: new Date(Date.now() + 86400_000).toISOString(),
      },
      outboundService: async (request) => {
        requests.push({ url: request.url, method: request.method })
        if (request.url === releaseURL) {
          expect(request.headers.get('authorization')).toBeNull()
          if (mode === 'release-redirect')
            return new Response(null, {
              status: 302,
              headers: { Location: 'https://example.invalid/' },
            })
          return Response.json({
            source_commit: 'a'.repeat(40),
            run_id: '123',
            event: 'push',
            built_at: new Date(
              Date.now() - (mode === 'recent' ? 60_000 : 3600_000),
            ).toISOString(),
          })
        }
        expect(request.url).toBe(dispatchURL)
        expect(request.headers.get('authorization')).toBe('Bearer test-only')
        expect(await request.json()).toEqual({
          ref: 'main',
          inputs: { trigger: 'external' },
        })
        return mode === 'dispatch-redirect'
          ? new Response(null, {
              status: 307,
              headers: { Location: 'https://example.invalid/' },
            })
          : new Response(null, { status: 204 })
      },
    })
    try {
      const worker = await mf.getWorker()
      expect(
        (await worker.scheduled({ cron: '11,26,41,56 * * * *' })).outcome,
      ).toBe('ok')
      expect(requests).toEqual(
        mode === 'recent' || mode === 'release-redirect'
          ? [{ url: releaseURL, method: 'GET' }]
          : [
              { url: releaseURL, method: 'GET' },
              { url: dispatchURL, method: 'POST' },
            ],
      )
    } finally {
      await mf.dispose()
    }
  },
)
