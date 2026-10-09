import { firmsAvailable } from '../state/explorer'
import {
  fireCellSteps,
  hazardColors,
  magnitudeSize,
  magnitudeSteps,
} from '../state/encoding'

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
          <span>Quake M2.5 → 6+, fades over 7 d</span>
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
        {firmsAvailable && (
          <p className="legend-row" aria-label="Thermal detections per 2° cell">
            <span className="legend-heat" aria-hidden="true">
              {fireCellSteps.map((step) => (
                <i key={step.label} style={{ background: step.color }} />
              ))}
            </span>
            <span>Thermal detections / 2° cell, 24 h</span>
          </p>
        )}
      </div>
    </details>
  )
}
