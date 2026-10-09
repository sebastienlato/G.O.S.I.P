// Direct NWS development requests remain loopback-only. Public USGS snapshots
// are same-origin and do not use this guard.
export function realSourcesAllowed(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}
export const localSourceAccess = realSourcesAllowed(
  typeof window === 'undefined' ? '' : window.location.hostname,
)
export const PUBLIC_SOURCE_NOTE =
  'Public NWS forecasts are not connected yet. Visit the official provider; no data is substituted.'
