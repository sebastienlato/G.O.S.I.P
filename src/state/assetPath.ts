// Canonical fixture paths stay host-independent; prefix only at rendering.
// This is not a source URL validator: reports.ts still validates exact IDs/paths.
export function assetPath(
  path: string,
  base = import.meta.env.BASE_URL,
): string {
  if (
    !/^\/[a-zA-Z0-9_./-]+$/.test(path) ||
    path.includes('//') ||
    path.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Expected a canonical local asset path')
  }
  return `${base}${path.slice(1)}`
}
