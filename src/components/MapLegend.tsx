import { firmsAvailable } from '../state/explorer'
import { heatGradientCss } from '../state/heat'
import { hazardColors, magnitudeSize, magnitudeSteps } from '../state/encoding'
import KindIcon from './KindIcon'

const samples = [3, 4.5, 5.5, 6.5]

/** Explains what is drawn on the globe. Feed-only layers are not listed. */
export default function MapLegend() {
  return (
    <details
      className="map-legend"
      // Open by default where there is room; a tap away on small screens.
      open={typeof window === 'undefined' || window.innerWidth > 1000}
    >
      <summary>Legend</summary>
      <div className="legend-body">
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
        <p className="legend-row">
          <span className="legend-badge" aria-hidden="true">
            <KindIcon kind="volcano" color={hazardColors.volcanoes} size={15} />
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
        {firmsAvailable && (
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
