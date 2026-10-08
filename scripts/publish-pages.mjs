// Manual, locally built release to the existing authorized repository only.
// No workflow, runner selection, cache, account, billing or Pages setting changes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: 'utf8', ...options }).trim()
const repo = 'sebastienlato/G.O.S.I.P'
const remote = 'https://github.com/sebastienlato/G.O.S.I.P.git'
assert(
  process.argv.slice(2).every((arg) => arg === '--publish'),
  'Only --publish is supported',
)
assert.equal(run('git', ['remote', 'get-url', 'origin']), remote)
assert.equal(run('git', ['remote', 'get-url', '--push', 'origin']), remote)
assert.equal(run('git', ['branch', '--show-current']), 'main')
assert.equal(
  run('git', ['status', '--porcelain']),
  '',
  'Commit source changes before preparing a release',
)
const info = JSON.parse(
  run('gh', ['repo', 'view', repo, '--json', 'nameWithOwner,visibility']),
)
assert.equal(info.nameWithOwner, repo)
assert.equal(
  info.visibility,
  'PUBLIC',
  'Stop: only the verified public-repository free path is supported',
)
const source = run('git', ['rev-parse', 'HEAD'])
assert.equal(
  run('git', ['ls-remote', 'origin', 'refs/heads/main']).split(/\s/)[0],
  source,
  'Push source main before publishing',
)
execFileSync('npm', ['run', 'build:pages'], { stdio: 'inherit' })
assert.equal(
  run('git', ['status', '--porcelain']),
  '',
  'Generated notices changed; review and commit first',
)
writeFileSync(
  'dist/release.json',
  JSON.stringify(
    {
      source_commit: source,
      base: '/G.O.S.I.P/',
      public_data: 'simulations-only',
      license: 'Apache-2.0',
    },
    null,
    2,
  ) + '\n',
)
if (!process.argv.includes('--publish')) {
  console.log(
    `Prepared dist/ from ${source}. No publish performed. Review before running with --publish.`,
  )
  process.exit(0)
}
// A separate index records dist without changing the owner's checkout or index.
const gitDir = resolve(run('git', ['rev-parse', '--git-dir']))
const temp = mkdtempSync(join(gitDir, 'gosip-pages-'))
try {
  const env = {
    ...process.env,
    GIT_INDEX_FILE: join(temp, 'index'),
    GIT_WORK_TREE: resolve('dist'),
    GIT_DIR: gitDir,
  }
  const previous = run('git', [
    'ls-remote',
    'origin',
    'refs/heads/gh-pages',
  ]).split(/\s/)[0]
  if (previous) run('git', ['fetch', 'origin', 'refs/heads/gh-pages'])
  run('git', ['read-tree', '--empty'], { env })
  run('git', ['add', '--all'], { env, cwd: resolve('dist') })
  const tree = run('git', ['write-tree'], { env })
  const sha = run('git', [
    'commit-tree',
    tree,
    ...(previous ? ['-p', previous] : []),
    '-m',
    `Publish simulation beta from ${source}`,
  ])
  // A concurrent update causes rejection. Never force-push or rewrite history.
  run('git', ['push', 'origin', `${sha}:refs/heads/gh-pages`])
  assert.equal(
    run('git', ['ls-remote', 'origin', 'refs/heads/gh-pages']).split(/\s/)[0],
    sha,
  )
  console.log(
    `Verified static branch ${sha}; source ${source}. Pages configuration/status must be checked separately.`,
  )
} finally {
  rmSync(temp, { recursive: true, force: true })
}
