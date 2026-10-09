// A dispatch or push is not evidence that GitHub's scheduler fired.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
const repo = 'sebastienlato/G.O.S.I.P'
const api = (path) =>
  JSON.parse(
    execFileSync('gh', ['api', `repos/${repo}/${path}`], { encoding: 'utf8' }),
  )
const { workflow_runs: runs } = api(
  'actions/workflows/publish-live.yml/runs?event=schedule&per_page=10',
)
const run = runs.find(
  (r) =>
    r.event === 'schedule' &&
    r.conclusion === 'success' &&
    r.head_branch === 'main',
)
assert(run, 'No successful schedule run: recovery is NOT verified')
const { jobs } = api(`actions/runs/${run.id}/jobs`)
for (const name of ['build', 'deploy', 'cleanup'])
  assert(
    jobs.some((j) => j.name === name && j.conclusion === 'success'),
    `${name} must succeed`,
  )
assert.equal(api(`actions/runs/${run.id}/artifacts`).total_count, 0)
const base = 'https://sebastienlato.github.io/G.O.S.I.P/'
const get = async (path) => {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(12000),
    cache: 'no-cache',
    redirect: 'error',
  })
  assert(response.ok)
  return response.json()
}
const release = await get('release.json')
assert.equal(
  release.event,
  'schedule',
  'Live release was not published by schedule',
)
assert.equal(release.run_id, String(run.id))
assert.equal(release.source_commit, run.head_sha)
const health = await get('data/health.json')
for (const h of health.sources) {
  assert.equal(h.status, 'ok', `${h.source}: scheduled ingestion must succeed`)
  assert(Date.parse(h.attempted_at) >= Date.parse(run.created_at))
  assert(Date.now() - Date.parse(h.fetched_at) < 45 * 60000)
  assert.deepEqual((await get(`data/${h.source}.json`)).health, h)
}
console.log(
  JSON.stringify(
    {
      run_id: run.id,
      event: run.event,
      created_at: run.created_at,
      sha: run.head_sha,
      url: run.html_url,
      artifact_count: 0,
      health: health.sources,
    },
    null,
    2,
  ),
)
