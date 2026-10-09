import {
  EONET_URL,
  EONET_MAX_BYTES,
  parseEONET,
  publishEONET,
  decodeEONET,
} from '../src/data/eonet'
import { ingestSource } from './source'
export const ingestEONET = (fetcher: typeof fetch = fetch, now = Date.now()) =>
  ingestSource(
    {
      source: 'eonet',
      url: EONET_URL,
      maxBytes: EONET_MAX_BYTES,
      parse: parseEONET,
      // A valid empty 30-day catalogue is possible. Missing/malformed envelopes fail.
      // EONET supplies no generation time; retrieval freshness cannot prove curation freshness.
      validate() {},
      publish: publishEONET,
      decode: decodeEONET,
    },
    fetcher,
    now,
  )
