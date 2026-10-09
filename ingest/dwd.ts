import {
  DWD_URL,
  DWD_MAX_BYTES,
  parseDWD,
  decodeDWDResponse,
  publishDWD,
  decodeDWD,
} from '../src/data/dwd'
import { LIVE_STALE_MS } from '../src/data/published'
import { ingestSource } from './source'
export const ingestDWD = (fetcher: typeof fetch = fetch, now = Date.now()) =>
  ingestSource(
    {
      source: 'dwd',
      url: DWD_URL,
      maxBytes: DWD_MAX_BYTES,
      decodeResponse: decodeDWDResponse,
      parse: parseDWD,
      publish: publishDWD,
      decode: decodeDWD,
      validate(s, time) {
        if (time - Date.parse(s.generated_at) > LIVE_STALE_MS)
          throw Error('Stale feed')
      },
    },
    fetcher,
    now,
  )
