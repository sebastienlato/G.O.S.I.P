// Strict local static host: no SPA fallback that could hide broken asset paths.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
const root = resolve('dist')
const base = '/G.O.S.I.P/'
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.geojson': 'application/geo+json',
  '.txt': 'text/plain',
}
createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  if (!pathname.startsWith(base)) {
    res.writeHead(404).end()
    return
  }
  let relative
  try {
    relative = decodeURIComponent(pathname.slice(base.length))
  } catch {
    res.writeHead(400).end()
    return
  }
  const path = resolve(root, relative || 'index.html')
  if (!path.startsWith(root + sep)) {
    res.writeHead(404).end()
    return
  }
  try {
    const content = await readFile(path)
    res.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
    })
    res.end(content)
  } catch {
    res.writeHead(404).end()
  }
}).listen(4173, '127.0.0.1', () =>
  console.log(`Static candidate: http://127.0.0.1:4173${base}`),
)
