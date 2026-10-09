// Thermal heat field: FIRMS 2° detection counts rendered as a smooth,
// equirectangular heat texture (lon -180..180, lat 90..-90) that is draped on
// the globe. Each cell becomes a soft blob whose strength grows with log(count),
// so the data's 2° aggregation reads as heat, not as pixel squares.
export const HEAT_WIDTH = 4096
export const HEAT_HEIGHT = 2048

/** Ramp stops from faint ember to white-hot, matched by the legend. */
export const heatStops = [
  [0, 'rgba(110, 10, 8, 0)'],
  [0.12, 'rgba(160, 18, 10, 0.45)'],
  [0.35, 'rgba(236, 40, 20, 0.85)'],
  [0.6, 'rgba(255, 104, 18, 0.95)'],
  [0.82, 'rgba(255, 170, 28, 1)'],
  [1, 'rgba(255, 222, 80, 1)'],
] as const
export const heatGradientCss = `linear-gradient(90deg, ${heatStops
  .slice(1)
  .map(([at, color]) => `${color} ${Math.round(at * 100)}%`)
  .join(', ')})`

/** Heat opacity by camera height: full from orbit, a light veil up close so
 *  the satellite ground stays readable (the data is only 2° resolution). */
export const heatAlpha = (height: number) =>
  0.3 + 0.62 * Math.min(1, Math.max(0, (height - 1_200_000) / 6_000_000))

export const heatWeight = (count: number) =>
  0.42 * Math.min(1, 0.12 + Math.log10(count + 1) / 4.5)

export function buildHeatCanvas(
  cells: { lon: number; lat: number; count: number }[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = HEAT_WIDTH
  canvas.height = HEAT_HEIGHT
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const pxPerDeg = HEAT_WIDTH / 360
  // 1. Accumulate strength in the alpha channel.
  for (const { lon, lat, count } of cells) {
    const x = (lon + 180) * pxPerDeg
    const y = (90 - lat) * pxPerDeg
    const r = (1.6 + 0.45 * Math.log10(count + 1)) * pxPerDeg
    const w = heatWeight(count)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(0,0,0,${w})`)
    g.addColorStop(0.5, `rgba(0,0,0,${w * 0.5})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 2. Colourise through a 256-step lookup of the ramp.
  const ramp = document.createElement('canvas')
  ramp.width = 256
  ramp.height = 1
  const rc = ramp.getContext('2d', { willReadFrequently: true })!
  const lg = rc.createLinearGradient(0, 0, 256, 0)
  for (const [at, color] of heatStops) lg.addColorStop(at, color)
  rc.fillStyle = lg
  rc.fillRect(0, 0, 256, 1)
  const lut = rc.getImageData(0, 0, 256, 1).data
  const image = ctx.getImageData(0, 0, HEAT_WIDTH, HEAT_HEIGHT)
  const px = image.data
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]
    if (!a) continue
    const j = Math.min(255, Math.round(Math.pow(a / 255, 0.85) * 255)) * 4
    px[i] = lut[j]
    px[i + 1] = lut[j + 1]
    px[i + 2] = lut[j + 2]
    px[i + 3] = lut[j + 3]
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}
