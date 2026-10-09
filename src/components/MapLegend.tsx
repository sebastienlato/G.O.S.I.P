import { firmsAvailable } from '../state/explorer'
import {
  fireColor,
  warningColor,
  hazardColors,
  magnitudeSize,
  magnitudeSteps,
} from '../state/encoding'

const samples = [3, 4.5, 5.5, 6.5]

/** Explains marker size, colour, fade and shape for live layers. */
export default function MapLegend() {
  return (
    <details
      className="map-legend"
      // Open by default where there is room; a tap away on small screens.
      open={typeof window === 'undefined' || window.innerWidth > 640}
    >
      <summary>Legend</summary>
      <div className="legend-body">
        <p className="legend-row" aria-label="Earthquake magnitude scale">
          <span className="legend-scale" aria-hidden="true">
            {samples.map((m, i) => (
              <i
                key={m}
                style={{
                  width: magnitudeSize(m),
                  height: magnitudeSize(m),
                  background: magnitudeSteps[i].color,
                }}
              />
            ))}
          </span>
          <span>Magnitude 2.5 → 6+</span>
        </p>
        <p className="legend-row">
          <span className="legend-fade" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Fades over 7 days</span>
        </p>
        <p className="legend-row">
          <span
            className="glyph glyph-volcano"
            style={{ '--mark': hazardColors.volcanoes } as React.CSSProperties}
            aria-hidden="true"
          />
          <span>Volcano</span>
          <span
            className="glyph glyph-storm"
            style={
              { '--mark': hazardColors.severeStorms } as React.CSSProperties
            }
            aria-hidden="true"
          />
          <span>Storm</span>
        </p>
        <p className="legend-row">
          <span
            className="glyph glyph-warning"
            style={{ '--mark': warningColor } as React.CSSProperties}
            aria-hidden="true"
          />
          <span>DWD warnings · feed only</span>
        </p>
        {firmsAvailable && (
          <p className="legend-row">
            <span
              className="glyph glyph-fire"
              style={{ '--mark': fireColor } as React.CSSProperties}
              aria-hidden="true"
            />
            <span>Thermal · 2° cell · delayed ≥24h</span>
          </p>
        )}
      </div>
    </details>
  )
}
