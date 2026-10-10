// Trigger only. No HTTP handler, storage, provider ingestion or arbitrary destination.
export const CRON = '11,26,41,56 * * * *'
const RELEASE = 'https://sebastienlato.github.io/G.O.S.I.P/release.json'
const DISPATCH =
  'https://api.github.com/repos/sebastienlato/G.O.S.I.P/actions/workflows/publish-live.yml/dispatches'
export async function runTrigger(env, fetcher = fetch, now = Date.now()) {
  const expiry = Date.parse(env.TOKEN_EXPIRES_AT)
  if (
    !env.GITHUB_DISPATCH_TOKEN ||
    !Number.isFinite(expiry) ||
    expiry <= now ||
    expiry - now > 90 * 86400_000
  )
    return 'configuration-required'
  try {
    const response = await fetcher(RELEASE, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (
      !response.ok ||
      Number(response.headers.get('content-length')) > 2000 ||
      !response.body
    )
      return 'release-unavailable'
    const reader = response.body.getReader()
    let raw = '',
      bytes = 0
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })
    try {
      while (true) {
        const part = await reader.read()
        if (part.done) break
        bytes += part.value.byteLength
        if (bytes > 2000) return 'release-unavailable'
        raw += decoder.decode(part.value, { stream: true })
      }
      raw += decoder.decode()
    } finally {
      await reader.cancel().catch(() => {})
    }
    const release = JSON.parse(raw),
      built = Date.parse(release.built_at)
    if (
      !/^[a-f0-9]{40}$/.test(release.source_commit) ||
      !/^\d{1,20}$/.test(release.run_id) ||
      !['push', 'schedule', 'workflow_dispatch'].includes(release.event) ||
      !Number.isFinite(built) ||
      built > now
    )
      return 'release-unavailable'
    if (now - built < 15 * 60_000) return 'recent-publication'
    const result = await fetcher(DISPATCH, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'GOSIP-publish-trigger',
      },
      body: JSON.stringify({ ref: 'main', inputs: { trigger: 'external' } }),
    })
    await result.body?.cancel().catch(() => {})
    return result.status === 204 ? 'dispatch-accepted' : 'dispatch-rejected'
  } catch {
    return 'request-failed'
  } // Never log credentials, URLs, bodies or arbitrary exceptions.
}
export default {
  async scheduled(controller, env) {
    if (controller.cron !== CRON) return
    const outcome = await runTrigger(env)
    console.log(outcome) // Fixed safe outcome only; acceptance is not publication.
  },
}
