import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const { ingestUSGS } = await server.ssrLoadModule('/ingest/usgs.ts')
  const result = await ingestUSGS()
  await mkdir('public/data', { recursive: true })
  await writeFile('public/data/usgs.json', JSON.stringify(result))
  await writeFile(
    'public/data/health.json',
    JSON.stringify({ version: 1, sources: [result.health] }),
  )
  console.log(JSON.stringify(result.health))
} finally {
  await server.close()
}
