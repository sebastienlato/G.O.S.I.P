import { parseUSGS, USGS_URL, MAX_BYTES } from '../src/data/usgs'
import { decodePublished, publish, LIVE_STALE_MS } from '../src/data/published'
import { ingestSource } from './source'
export const LIVE_URL =
  'https://sebastienlato.github.io/G.O.S.I.P/data/usgs.json'
export const ingestUSGS = (fetcher: typeof fetch = fetch, now = Date.now()) =>
  ingestSource(
    {
      source: 'usgs',
      url: USGS_URL,
      maxBytes: MAX_BYTES,
      parse: parseUSGS,
      validate(snapshot, now) {
        if (
          !snapshot.events.length ||
          now - Date.parse(snapshot.generated_at) > LIVE_STALE_MS
        )
          throw Error('Empty or stale USGS')
      },
      publish,
      decode: decodePublished,
    },
    fetcher,
    now,
  )
