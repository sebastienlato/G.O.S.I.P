import { expect, it, vi } from 'vitest'
import worker, { runTrigger } from './worker.mjs'
const now = Date.parse('2026-10-10T15:00:00Z')
const env = {
  GITHUB_DISPATCH_TOKEN: 'test-only',
  TOKEN_EXPIRES_AT: '2026-12-01T00:00:00Z',
}
const release = (age) => ({
  source_commit: 'a'.repeat(40),
  run_id: '123',
  event: 'push',
  built_at: new Date(now - age).toISOString(),
})
it('has no HTTP trigger and fails closed on missing/expired/overlong configuration', async () => {
  expect(worker.fetch).toBeUndefined()
  for (const value of [
    {},
    { ...env, TOKEN_EXPIRES_AT: '2026-10-09' },
    { ...env, TOKEN_EXPIRES_AT: '2030-01-01' },
  ]) {
    const f = vi.fn()
    expect(await runTrigger(value, f, now)).toBe('configuration-required')
    expect(f).not.toHaveBeenCalled()
  }
})
it('checks a bounded release without credentials; dispatches only fixed main workflow when old', async () => {
  for (const [age, calls] of [
    [14 * 60_000, 1],
    [16 * 60_000, 2],
  ]) {
    const f = vi.fn(async (url, options) => {
      expect(options.redirect).toBe('manual')
      if (url.endsWith('release.json')) {
        expect(options.headers.Authorization).toBeUndefined()
        return Response.json(release(age))
      }
      expect(url).toBe(
        'https://api.github.com/repos/sebastienlato/G.O.S.I.P/actions/workflows/publish-live.yml/dispatches',
      )
      expect(JSON.parse(options.body)).toEqual({
        ref: 'main',
        inputs: { trigger: 'external' },
      })
      return new Response(null, { status: 204 })
    })
    expect(await runTrigger(env, f, now)).toBe(
      calls === 1 ? 'recent-publication' : 'dispatch-accepted',
    )
    expect(f).toHaveBeenCalledTimes(calls)
  }
})
it('no retry on oversized, malformed, future, denied or failed response', async () => {
  for (const response of [
    new Response('x'.repeat(2001)),
    new Response('{}'),
    Response.json(release(-1000)),
    new Response('', { status: 429 }),
    new Response('', {
      status: 302,
      headers: { Location: 'https://example.invalid/' },
    }),
  ]) {
    const f = vi.fn(async () => response)
    expect(await runTrigger(env, f, now)).toMatch(/unavailable|failed/)
    expect(f).toHaveBeenCalledTimes(1)
  }
  const f = vi
    .fn()
    .mockResolvedValueOnce(Response.json(release(3600_000)))
    .mockRejectedValueOnce(Error('secret text'))
  expect(await runTrigger(env, f, now)).toBe('request-failed')
  expect(f).toHaveBeenCalledTimes(2)
})
