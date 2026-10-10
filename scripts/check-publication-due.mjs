import { createServer } from 'vite'
import { appendFile } from 'node:fs/promises'
const server = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
})
try {
  const { publicationDue } = await server.ssrLoadModule('/ingest/cadence.ts')
  const due =
    process.env.GITHUB_EVENT_NAME === 'push' ||
    process.env.MANUAL_TRIGGER === 'manual' ||
    (await publicationDue())
  await appendFile(process.env.GITHUB_OUTPUT, `publish=${due}\n`)
  console.log(
    due
      ? 'Publication due (source request caps still apply).'
      : 'Recent publication / no source due: skip ingestion and deployment.',
  )
} finally {
  await server.close()
}
