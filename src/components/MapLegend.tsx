import { maritimeAvailable } from '../state/explorer'
import { maritimeColor } from '../state/encoding'
import {
  firmsAvailable,
  ooniAvailable,
  launchesAvailable,
} from '../state/explorer'
import { heatGradientCss } from '../state/heat'
import {
  ooniColor,
  launchColor,
  hazardColors,
  magnitudeSize,
  magnitudeSteps,
} from '../state/encoding'
import KindIcon from './KindIcon'
import type { MarkerKind } from '../state/encoding'

const samples = [3, 4.5, 5.5, 6.5]

/**
 * Explains what is drawn on the globe: only kinds with records in the current
 * view. Feed-only layers are not listed.
 */
export default function MapLegend({ shown }: { shown: Set<MarkerKind> }) {
  const has = (...kinds: MarkerKind[]) => kinds.some((k) => shown.has(k))
  if (!has('quake', 'volcano', 'storm', 'maritime', 'launch', 'ooni', 'fire'))
    return null
  return (
    <details
      className="map-legend"
      // Open by default where there is room; a tap away on small screens.
      open={typeof window === 'undefined' || window.innerWidth > 1000}
    >
      <summary>Legend</summary>
      <div className="legend-body">
        {has('quake') && (
          <p className="legend-row" aria-label="Earthquake magnitude scale">
            <span className="legend-scale" aria-hidden="true">
              {samples.map((m, i) => (
                <span
                  key={m}
                  className="event-marker kind-quake legend-mark"
                  style={
                    {
                      '--marker-color': magnitudeSteps[i].color,
                      '--size': `${magnitudeSize(m)}px`,
                    } as React.CSSProperties
                  }
                >
                  <span />
                </span>
              ))}
            </span>
            <span>Earthquake M2.5 → 6+, fades over 7 days</span>
          </p>
        )}
        {has('volcano', 'storm') && (
          <p className="legend-row">
            <span className="legend-badge" aria-hidden="true">
              <KindIcon
                kind="volcano"
                color={hazardColors.volcanoes}
                size={15}
              />
            </span>
            <span>Volcano</span>
            <span className="legend-badge" aria-hidden="true">
              <KindIcon
                kind="storm"
                color={hazardColors.severeStorms}
                size={15}
              />
            </span>
            <span>Storm</span>
          </p>
        )}
        {maritimeAvailable && has('maritime') && (
          <p className="legend-row">
            <span className="legend-badge" aria-hidden="true">
              <KindIcon kind="maritime" color={maritimeColor} size={15} />
            </span>
            <span>Delayed port calls · regional glow</span>
          </p>
        )}
        {launchesAvailable && has('launch') && (
          <p className="legend-row">
            <span className="legend-badge" aria-hidden="true">
              <KindIcon kind="launch" color={launchColor} size={15} />
            </span>
            <span>Scheduled launch · site context</span>
          </p>
        )}
        {ooniAvailable && has('ooni') && (
          <p className="legend-row">
            <span className="legend-badge" aria-hidden="true">
              <KindIcon kind="ooni" color={ooniColor} size={15} />
            </span>
            <span>Digital measurements · country context</span>
          </p>
        )}
        {firmsAvailable && has('fire') && (
          <p className="legend-row" aria-label="Thermal detection density">
            <span
              className="legend-heat"
              aria-hidden="true"
              style={{ background: heatGradientCss }}
            />
            <span>Thermal detections, 24 h (low → high)</span>
          </p>
        )}
      </div>
    </details>
  )
}
