import { localSourceAccess } from '../state/sourceAccess'
import { additionalLayers, type AdditionalSource } from '../data/additional'
import type { useHazards, useEarthquakes } from '../state/useEarthquakes'
import type { LiveLayer, Source } from '../state/explorer'
import { formatTimestamp } from '../data/events'
import { hazardColors, magnitudeSteps } from '../state/encoding'

type Quakes = ReturnType<typeof useEarthquakes>
type Hazards = ReturnType<typeof useHazards>

const layerMeta: Record<
  LiveLayer,
  { label: string; name: string; provider: string }
> = {
  usgs: {
    label: 'Earthquakes',
    name: 'USGS earthquakes',
    provider: 'USGS',
  },
  eonet: {
    label: 'Storms and volcanoes',
    name: 'EONET global hazards (storms and volcanoes)',
    provider: 'NASA EONET',
  },
}

/** Live layer switches with per-layer counts and freshness. */
export function LayerToggles({
  liveLayers,
  onToggle,
  counts,
  quakes,
  hazards,
}: {
  liveLayers: LiveLayer[]
  onToggle: (layer: LiveLayer) => void
  counts: Record<LiveLayer, number>
  quakes: Quakes
  hazards: Hazards
}) {
  const state = { usgs: quakes, eonet: hazards }
  return (
    <fieldset className="layer-toggles">
      <legend className="sr-only">Live layers</legend>
      {(['usgs', 'eonet'] as const).map((key) => {
        const on = liveLayers.includes(key)
        const s = state[key]
        const status = !on
          ? 'Off'
          : s.loading && !s.snapshot
            ? 'Loading'
            : !s.snapshot
              ? 'Unavailable'
              : s.stale
                ? `${counts[key]} · stale`
                : `${counts[key]}`
        return (
          <label
            key={key}
            className={`layer-toggle ${on ? 'on' : ''} ${on && (s.stale || !s.snapshot) && !s.loading ? 'warn' : ''}`}
          >
            <input
              type="checkbox"
              checked={on}
              aria-label={layerMeta[key].name}
              onChange={() => onToggle(key)}
            />
            <span className={`layer-glyph glyph-${key}`} aria-hidden="true">
              {key === 'usgs' ? (
                magnitudeSteps.map((step) => (
                  <i key={step.label} style={{ background: step.color }} />
                ))
              ) : (
                <>
                  <i style={{ background: hazardColors.severeStorms }} />
                  <i style={{ background: hazardColors.volcanoes }} />
                </>
              )}
            </span>
            <span className="layer-name">{layerMeta[key].label}</span>
            <span className="layer-count">{status}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

/** Separate demonstrations, kept out of the live view. */
export function SimulationLab({
  source,
  onChange,
}: {
  source: Source
  onChange: (source: Source) => void
}) {
  const simulations: [Source, string][] = [
    ['demo', 'Other examples · simulated'],
    ['fire-demo', 'Fire examples · simulated'],
    ['reports-demo', 'Global reports · simulated'],
    ['digital-demo', 'Digital world · simulated'],
    ...Object.entries(additionalLayers).map(
      ([key, layer]): [Source, string] => [
        key as AdditionalSource,
        `${layer.label} · simulated`,
      ],
    ),
  ]
  return (
    <details
      className="lab disclosure"
      open={source !== 'usgs' ? true : undefined}
    >
      <summary>Simulation lab · invented examples</summary>
      <div className="disclosure-body">
        <p>
          Demonstrations for layers that are not live yet. They never mix with
          live data.
        </p>
        <div className="lab-sources">
          {simulations.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={source === key}
              onClick={() => onChange(key)}
            >
              {label}
            </button>
          ))}
          {localSourceAccess && (
            <button onClick={() => onChange('nws')}>
              NWS weather · local development
            </button>
          )}
        </div>
      </div>
    </details>
  )
}

/** Status, freshness and provenance for each active live layer. */
export function LiveStatus({
  liveLayers,
  quakes,
  hazards,
}: {
  liveLayers: LiveLayer[]
  quakes: Quakes
  hazards: Hazards
}) {
  const { snapshot, health, loading, error, stale, waitSeconds, offline } =
    quakes
  return (
    <section className="live-status" aria-label="Data source">
      <h2 className="section-title">Sources and freshness</h2>
      <p className="section-lede">
        Coming next: floods, fire detections, weather warnings, news, digital,
        space and movement.
      </p>
      <div className="status-grid">
        {liveLayers.includes('usgs') && (
          <div className="source-status">
            <div aria-live="polite">
              <strong
                className={!snapshot || stale ? 'status-warn' : 'status-ok'}
              >
                {loading
                  ? 'Loading earthquake snapshot…'
                  : !snapshot
                    ? 'USGS unavailable · no observations loaded'
                    : stale
                      ? 'STALE · last available observations'
                      : 'Live USGS earthquakes'}
              </strong>
              {snapshot && (
                <p>
                  Retrieved {formatTimestamp(snapshot.retrieved_at)} ·{' '}
                  {snapshot.events.length} earthquakes in the week snapshot.
                </p>
              )}
              {error && <p className="source-error">{error}</p>}
            </div>
            <details className="disclosure">
              <summary>Freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  M2.5+ earthquakes · USGS / ANSS · Estimates may change.
                  Coverage varies; no impact assessment.
                </p>
                <p>
                  Ingestion scheduled every 15 minutes; delays are possible.
                  Stale after 45 minutes or a failed ingestion. This page checks
                  published data every 15 minutes while visible.
                </p>
                {health && (
                  <p>
                    Last pipeline attempt {formatTimestamp(health.attempted_at)}{' '}
                    · Status: {health.status}.
                  </p>
                )}
                {snapshot && (
                  <p>
                    Feed generated {formatTimestamp(snapshot.generated_at)} ·
                    Retrieved {formatTimestamp(snapshot.retrieved_at)} ·{' '}
                    {snapshot.rejected} invalid records rejected;{' '}
                    {snapshot.excluded} non-earthquake records excluded.
                  </p>
                )}
                <a
                  href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                  target="_blank"
                  rel="noreferrer"
                >
                  U.S. Geological Survey / ANSS source ↗
                </a>
                <div className="source-actions">
                  <button
                    onClick={() => void quakes.refresh()}
                    disabled={loading || offline || waitSeconds > 0}
                  >
                    Refresh published data
                  </button>
                  {offline && <span>Offline · refresh paused</span>}
                </div>
              </div>
            </details>
          </div>
        )}
        {liveLayers.includes('eonet') && (
          <div className="source-status" aria-label="EONET status">
            <strong
              aria-live="polite"
              className={
                !hazards.snapshot || hazards.stale ? 'status-warn' : 'status-ok'
              }
            >
              {hazards.loading
                ? 'Loading hazard snapshot…'
                : !hazards.snapshot
                  ? 'EONET unavailable · no catalog loaded'
                  : hazards.stale
                    ? 'STALE · last available EONET catalog'
                    : 'Live EONET global hazards'}
            </strong>
            {hazards.snapshot && (
              <p>
                Retrieved {formatTimestamp(hazards.snapshot.retrieved_at)} ·{' '}
                {hazards.snapshot.events.length} catalog entries in the 30-day
                request.
              </p>
            )}
            {hazards.error && <p className="source-error">{hazards.error}</p>}
            {hazards.snapshot?.events.length === 0 && (
              <p>
                Valid empty catalog response. This does not mean there are no
                hazards.
              </p>
            )}
            <details className="disclosure">
              <summary>EONET freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  NASA EONET · Curated storms and volcanoes. Approximate
                  metadata, not official warnings.
                </p>
                <p>
                  Shared ingestion and page checks every 15 minutes; delays
                  possible. Stale after 45 minutes from retrieval or a failed
                  check. Feed generation and publication times are not supplied;
                  recent retrieval does not prove recent curation.
                </p>
                {hazards.health && (
                  <p>
                    Last pipeline attempt{' '}
                    {formatTimestamp(hazards.health.attempted_at)} · Status:{' '}
                    {hazards.health.status}.
                  </p>
                )}
                <p>
                  Open and closed catalog entries; latest geometry date drives
                  the window. Dates and locations are approximate, not incident
                  onset or affected area. Polygon records are feed-only. No
                  grouping or corroboration across sources; the same hazard may
                  appear in more than one source.
                </p>
                <a
                  href="https://eonet.gsfc.nasa.gov/what-is-eonet"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA EONET scope & disclaimer ↗
                </a>
                <div className="source-actions">
                  <button
                    onClick={() => void hazards.refresh()}
                    disabled={
                      hazards.loading ||
                      hazards.offline ||
                      hazards.waitSeconds > 0
                    }
                  >
                    Refresh EONET data
                  </button>
                  {hazards.offline && <span>Offline · refresh paused</span>}
                </div>
              </div>
            </details>
          </div>
        )}
        {!liveLayers.length && (
          <p className="section-lede">
            Turn on a live layer to see its source status.
          </p>
        )}
      </div>
    </section>
  )
}
