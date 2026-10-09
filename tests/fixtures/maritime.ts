import { MARITIME_DAY, maritimeRegions } from '../../src/data/maritime'
export function maritimeFixture(now: number, counts = [60, 71, 50, 65, 109]) {
  const day = new Date(
    Math.floor(now / MARITIME_DAY) * MARITIME_DAY - 5 * MARITIME_DAY,
  )
    .toISOString()
    .slice(0, 10)
  return {
    features: Object.values(maritimeRegions)
      .flatMap((r) => [...r.ports])
      .map((portid, i) => ({
        attributes: { date: day, portid, portcalls: counts[i] },
      })),
  }
}
