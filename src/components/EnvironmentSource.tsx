import { formatTimestamp } from '../data/events'
import { FIRE_NOTE } from '../data/fire'
import { NWS_PAGE, WEATHER_COVERAGE } from '../data/weather'
import type { useWeather } from '../state/useWeather'
export default function EnvironmentSource({
  source,
  weather,
  fallback,
}: {
  source: string
  weather: ReturnType<typeof useWeather>
  fallback: () => void
}) {
  if (source === 'fire-demo')
    return (
      <section
        className="feed-source environment-source"
        aria-label="Fire example source"
      >
        <div className="source-status">
          <strong>SIMULATED · Fire & thermal anomalies</strong>
          <p>{FIRE_NOTE}</p>
          <p>
            Four original examples · fixed 08 Oct 2026, 16:00 UTC clock · broad
            illustrative locations. All sensor values and confidence labels are
            invented. No live fire feed is connected.
          </p>
          <p>
            NASA FIRMS area API requires a key; no account or key was created.{' '}
            <a
              href="https://firms.modaps.eosdis.nasa.gov/api/area/"
              target="_blank"
              rel="noreferrer"
            >
              About the potential source ↗
            </a>
          </p>
        </div>
      </section>
    )
  if (source !== 'nws') return null
  const { snapshot, error, loading, stale, refresh, waitSeconds, offline } =
    weather
  return (
    <section
      className="feed-source environment-source"
      aria-label="Weather source status"
    >
      <div className="source-status">
        <div aria-live="polite">
          <strong>
            {loading
              ? 'Loading NWS forecast…'
              : error
                ? snapshot
                  ? 'Refresh failed · retained forecast is stale'
                  : 'NWS unavailable · no forecast loaded'
                : snapshot
                  ? stale
                    ? 'STALE · check NWS for a newer forecast'
                    : 'NWS forecast loaded · manual refresh'
                  : 'NWS forecast'}
          </strong>
          {error && <p className="source-error">{error}</p>}
          {snapshot && (
            <p>
              Provider updated {formatTimestamp(snapshot.updated_at)} ·
              Generated {formatTimestamp(snapshot.generated_at)} · Retrieved{' '}
              {formatTimestamp(snapshot.retrieved_at)}. {snapshot.rejected}{' '}
              invalid periods rejected.
            </p>
          )}
        </div>
        <p>{WEATHER_COVERAGE}</p>
        <p>
          Credit:{' '}
          <a href={NWS_PAGE} target="_blank" rel="noreferrer">
            NOAA / National Weather Service ↗
          </a>
          . NWS text and values are reproduced with GOSIP labels. No
          endorsement. Periods overlap the next selected time window; validity
          is shown in UTC.
        </p>
        <p>
          Memory only · stale after 6 hours from the oldest source/retrieval
          time, or a failed refresh. No polling. At most one two-request refresh
          per hour in this page; reloads and other tabs are not coordinated. No
          saved weather cache.
        </p>
        {offline && (
          <p className="source-error">
            Offline · loaded forecast remains available. Reconnect, then refresh
            manually.
          </p>
        )}
        <div className="source-actions">
          <button
            disabled={loading || offline || waitSeconds > 0}
            onClick={() => void refresh()}
          >
            {loading ? 'Loading…' : error ? 'Retry NWS' : 'Refresh NWS'}
          </button>
          {waitSeconds > 0 && (
            <span>Refresh available in {Math.ceil(waitSeconds / 60)} min</span>
          )}
          {error && (
            <button onClick={fallback}>Explore fire simulations</button>
          )}
        </div>
      </div>
    </section>
  )
}
