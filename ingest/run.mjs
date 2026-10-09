import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const { ingestUSGS } = await server.ssrLoadModule('/ingest/usgs.ts')
  const { ingestEONET } = await server.ssrLoadModule('/ingest/eonet.ts')
  const { ingestDWD } = await server.ssrLoadModule('/ingest/dwd.ts')
  const { ingestFIRMS } = await server.ssrLoadModule('/ingest/firms.ts')
  const { ingestNews } = await server.ssrLoadModule('/ingest/news.ts')
  const { ingestOoni } = await server.ssrLoadModule('/ingest/ooni.ts')
  const results = await Promise.all([
    ingestOoni(),
    ingestUSGS(),
    ingestEONET(),
    ingestDWD(),
    ingestNews(),
    ingestFIRMS(process.env.FIRMS_MAP_KEY),
  ])
  await mkdir('public/data', { recursive: true })
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
