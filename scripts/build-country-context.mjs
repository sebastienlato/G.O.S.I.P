// Optional geography rebuild; not part of ingestion. Natural Earth is public domain.
// Input: ne_110m_admin_0_countries.geojson from natural-earth-vector commit
// ca96624a56bd078437bca8184e78163e5039ad19 (geojson/ directory).
// Download manually from https://github.com/nvkelso/natural-earth-vector then pass its path.
import { readFileSync, writeFileSync } from 'node:fs'
const source = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const rows = source.features
  .map(({ properties: p }) => p)
  .filter((p) => /^[A-Z]{2}$/.test(p.ISO_A2_EH))
  .sort((a, b) => a.ISO_A2_EH.localeCompare(b.ISO_A2_EH))
const anchors = Object.fromEntries(
  rows.map((p) => [
    p.ISO_A2_EH,
    [p.NAME_EN, Math.round(p.LABEL_X), Math.round(p.LABEL_Y)],
  ]),
)
writeFileSync(
  'src/data/countryContext.json',
  JSON.stringify(anchors, null, 2) + '\n',
)
