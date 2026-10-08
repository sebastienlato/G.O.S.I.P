import { formatTimestamp } from '../data/events'
import { COVERAGE, type EarthquakeSnapshot } from '../data/usgs'

type Props = {
  source: 'demo' | 'usgs'
  onChange: (source: 'demo' | 'usgs') => void
  snapshot: EarthquakeSnapshot | null
  loading: boolean
  error: string
  stale: boolean
  waitSeconds: number
  refresh: () => Promise<void>
}
export default function FeedSource({
  source,
  onChange,
  snapshot,
  loading,
  error,
  stale,
  waitSeconds,
  refresh,
}: Props) {
  return (
    <section className="feed-source" aria-label="Data source">
      <div className="source-choice">
        <span className="eyebrow">DATA SOURCE</span>
        <div className="view-switch">
          <button
            aria-pressed={source === 'demo'}
            className={source === 'demo' ? 'active' : ''}
            onClick={() => onChange('demo')}
          >
            Simulated examples
          </button>
          <button
            aria-pressed={source === 'usgs'}
            className={source === 'usgs' ? 'active' : ''}
            onClick={() => onChange('usgs')}
          >
            USGS earthquakes
          </button>
        </div>
      </div>
      {source === 'usgs' && (
        <div className="source-status">
          <div aria-live="polite">
            <strong>
              {loading
                ? 'Loading USGS observations…'
                : error
                  ? snapshot
                    ? 'Refresh failed · retained observations are stale'
                    : 'USGS unavailable · no observations loaded'
                  : snapshot
                    ? stale
                      ? 'STALE · refresh to check for changes'
                      : 'USGS snapshot loaded · manual refresh'
                    : 'USGS observations'}
            </strong>
            {error && <p className="source-error">{error}</p>}
            {snapshot && (
              <p>
                Feed generated {formatTimestamp(snapshot.generated_at)} ·
                Retrieved {formatTimestamp(snapshot.retrieved_at)}.{' '}
                {snapshot.rejected} invalid records rejected;{' '}
                {snapshot.excluded} non-earthquake records excluded.
              </p>
            )}
          </div>
          <p>{COVERAGE}</p>
          <p>
            Credit:{' '}
            <a
              href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
              target="_blank"
              rel="noreferrer"
            >
              U.S. Geological Survey / ANSS
            </a>
            . A snapshot is marked stale after 15 minutes. No automatic refresh.
          </p>
          <div className="source-actions">
            <button
              onClick={() => void refresh()}
              disabled={loading || waitSeconds > 0}
            >
              {loading ? 'Loading…' : error ? 'Retry USGS' : 'Refresh USGS'}
            </button>
            {waitSeconds > 0 && (
              <span>Refresh available in {waitSeconds}s</span>
            )}
            {error && (
              <button onClick={() => onChange('demo')}>
                Explore simulated fallback
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
