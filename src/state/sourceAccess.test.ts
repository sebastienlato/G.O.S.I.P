import { describe, expect, it } from 'vitest'
import { realSourcesAllowed } from './sourceAccess'
import { parseFilters, serializeFilters } from './explorer'

describe('public source and input boundaries', () => {
  it('allows exact loopback hosts only, with no public or suffix bypass', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]'])
      expect(realSourcesAllowed(host)).toBe(true)
    for (const host of [
      '',
      'example.org',
      'localhost.example.org',
      '127.0.0.1.example.org',
      '192.168.1.1',
    ])
      expect(realSourcesAllowed(host)).toBe(false)
  })
  it('removes controls and directional overrides while preserving multilingual search', () => {
    const query = 'مرحبا café 東京\u202e\u2066\u0085\u0000'
    const parsed = parseFilters(`?q=${encodeURIComponent(query)}`)
    expect(parsed.query).toBe('مرحبا café 東京')
    expect(parseFilters(serializeFilters(parsed)).query).toBe(parsed.query)
  })
})
