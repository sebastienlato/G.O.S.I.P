import assert from 'node:assert/strict'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
const base = '/G.O.S.I.P/'
const html = await readFile('dist/index.html', 'utf8')
assert(html.includes(`${base}assets/`), 'Missing repository asset base')
assert(html.includes(`${base}favicon.svg`), 'Missing repository favicon base')
assert(
  html.indexOf('Content-Security-Policy') < html.indexOf('<script'),
  'CSP must precede scripts',
)
// Page requests send only the site origin (Cesium ion token check, D54);
// outgoing links stay rel=noreferrer.
assert(
  html.includes('content="strict-origin"'),
  'Missing strict-origin referrer policy',
)
for (const path of [
  'world.svg',
  'world.geojson',
  'MAP_DATA_LICENSE.txt',
  'WORLD_ATLAS_LICENSE.txt',
  'dependency-notices.txt',
  'LICENSE.txt',
  'NOTICE.txt',
])
  await stat(join('dist', path))
assert.equal(
  await readFile('dist/LICENSE.txt', 'utf8'),
  await readFile('LICENSE', 'utf8'),
)
assert.equal(
  await readFile('dist/NOTICE.txt', 'utf8'),
  await readFile('NOTICE', 'utf8'),
)
const reports = JSON.parse(
  await readFile('src/data/reportExamples.json', 'utf8'),
)
for (const report of reports) {
  if (report.source_url)
    assert(
      (await readFile(join('dist', report.source_url), 'utf8')).includes(
        'NOT REAL NEWS',
      ),
    )
}
async function size(path) {
  let bytes = 0
  for (const entry of await readdir(path, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'No release symlinks')
    const file = join(path, entry.name)
    bytes += entry.isDirectory() ? await size(file) : (await stat(file)).size
  }
  return bytes
}
const bytes = await size('dist')
assert(
  bytes < 25_000_000,
  'Publication budget is 25 MB (owner-approved for the globe, D52); investigate instead of increasing hosting usage',
)
await writeFile('dist/.nojekyll', '')
console.log(
  `Checked repository-path candidate: ${bytes.toLocaleString()} bytes, no external build service.`,
)
