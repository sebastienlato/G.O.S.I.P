import { localSourceAccess } from '../state/sourceAccess'
import { additionalLayers, type AdditionalSource } from '../data/additional'
import type { Source } from '../state/explorer'
import { formatTimestamp } from '../data/events'
import type { EarthquakeSnapshot } from '../data/usgs'
import type { SourceHealth } from '../data/published'

type Props = {
  source: Source
  onChange: (source: Source) => void
  snapshot: EarthquakeSnapshot | null
  health: SourceHealth | null
  loading: boolean
  error: string
  stale: boolean
  waitSeconds: number
  offline: boolean
  refresh: () => Promise<void>
}
export default function FeedSource({
  source,
  onChange,
  snapshot,
  health,
  loading,
  error,
  stale,
  waitSeconds,
  offline,
  refresh,
}: Props) {
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
    <section className="feed-source" aria-label="Data source">
      <div className="source-choice">
        <span className="eyebrow">LIVE SOURCES</span>
        <div className="view-switch">
          <button
            aria-pressed={source === 'usgs'}
            className={source === 'usgs' ? 'active' : ''}
            onClick={() => onChange('usgs')}
          >
            USGS earthquakes
          </button>
        </div>
        <details open={source !== 'usgs' ? true : undefined}>
          <summary>Simulation lab · invented examples</summary>
          <p>Separate demonstrations. Never live events.</p>
          <div className="view-switch">
            {simulations.map(([key, label]) => (
              <button
                key={key}
                aria-pressed={source === key}
                onClick={() => onChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {localSourceAccess && (
            <button onClick={() => onChange('nws')}>
              NWS weather · local development
            </button>
          )}
        </details>
      </div>
      {source === 'usgs' && (
        <div className="source-status">
          <div aria-live="polite">
            <strong>
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
                Last updated {formatTimestamp(snapshot.retrieved_at)} ·{' '}
                {snapshot.events.length} earthquakes in the week snapshot.
              </p>
            )}
            {error && <p className="source-error">{error}</p>}
          </div>
          <p>
            M2.5+ earthquakes · USGS / ANSS · Estimates may change. Coverage
            varies; no impact assessment.
          </p>
          <details>
            <summary>Freshness & source details</summary>
            <p>
              Ingestion scheduled every 15 minutes; delays are possible. Stale
              after 45 minutes or a failed ingestion. This page checks published
              data every 15 minutes while visible.
            </p>
            {health && (
              <p>
                Last pipeline attempt {formatTimestamp(health.attempted_at)} ·
                Status: {health.status}.
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
          </details>
          <div className="source-actions">
            <button
              onClick={() => void refresh()}
              disabled={loading || offline || waitSeconds > 0}
            >
              Refresh published data
            </button>
            {offline && <span>Offline · refresh paused</span>}
          </div>
        </div>
      )}
    </section>
  )
}
