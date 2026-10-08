// Public traffic cannot be globally bounded by this static client. Keep real
// adapters available only on exact loopback hosts until a public access plan is reviewed.
export function realSourcesAllowed(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}
export const localSourceAccess = realSourcesAllowed(
  typeof window === 'undefined' ? '' : window.location.hostname,
)
export const PUBLIC_SOURCE_NOTE =
  'Real-source requests are disabled on this host. Public traffic limits are not established. Choose a labeled simulation or visit the official provider; no data is substituted.'
