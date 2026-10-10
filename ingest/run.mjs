import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
process.env.GOSIP_USE_CADENCE = '1'
const server = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
})
try {
  const { ingestUSGS } = await server.ssrLoadModule('/ingest/usgs.ts')
  const { ingestEONET } = await server.ssrLoadModule('/ingest/eonet.ts')
  const { ingestDWD } = await server.ssrLoadModule('/ingest/dwd.ts')
  const { ingestFIRMS } = await server.ssrLoadModule('/ingest/firms.ts')
  const { ingestNews } = await server.ssrLoadModule('/ingest/news.ts')
  const { ingestOoni } = await server.ssrLoadModule('/ingest/ooni.ts')
  const { ingestLaunches } = await server.ssrLoadModule('/ingest/launches.ts')
  const { ingestMaritime } = await server.ssrLoadModule('/ingest/maritime.ts')
  const { ingestArchive } = await server.ssrLoadModule('/ingest/archive.ts')
  const history = await ingestArchive()
  const results = await Promise.all([
    ingestLaunches(),
    ingestMaritime(),
    ingestOoni(),
    ingestUSGS(),
    ingestEONET(),
    ingestDWD(),
    ingestNews(),
    ingestFIRMS(process.env.FIRMS_MAP_KEY),
  ])
  await mkdir('public/data', { recursive: true })
  await writeFile('public/data/history.json', JSON.stringify(history))
  console.log(
    JSON.stringify({
      history: history.status,
      captures: history.captures.length,
      error: history.error,
    }),
  )
  for (const result of results) {
    await writeFile(
      `public/data/${result.health.source}.json`,
      JSON.stringify(result),
    )
    console.log(JSON.stringify(result.health))
  }
  await writeFile(
    'public/data/health.json',
    JSON.stringify({
      version: 1,
      sources: results.map((result) => result.health),
    }),
  )
} finally {
  await server.close()
}
