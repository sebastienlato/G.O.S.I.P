import { readFile, writeFile, mkdir } from 'node:fs/promises'
const examples = JSON.parse(
  await readFile(
    new URL('../src/data/reportExamples.json', import.meta.url),
    'utf8',
  ),
)
await mkdir(new URL('../public/reports/', import.meta.url), { recursive: true })
for (const report of examples) {
  if (!/^report-demo-[a-z0-9-]+$/.test(report.id))
    throw new Error('Invalid fixture ID')
  await writeFile(
    new URL(`../public/reports/${report.id}.txt`, import.meta.url),
    `GOSIP ORIGINAL SYNTHETIC REPORT — NOT REAL NEWS\nAll publishers, claims and timestamps below are invented fixture content.\nThis document is the original bundled source, not an external news article.\n\n${JSON.stringify(report, null, 2)}\n`,
  )
}
