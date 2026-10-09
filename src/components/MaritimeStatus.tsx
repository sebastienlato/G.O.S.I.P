import type { useMaritime } from '../state/useEarthquakes'
import { formatTimestamp } from '../data/events'
import {
  MARITIME_COVERAGE,
  MARITIME_CREDIT,
  MARITIME_TERMS,
} from '../data/maritime'
export default function MaritimeStatus({
  maritime: s,
}: {
  maritime: ReturnType<typeof useMaritime>
}) {
  return (
    <div className="source-status" aria-label="PortWatch status">
      <strong
        aria-live="polite"
        className={!s.snapshot || s.stale ? 'status-warn' : 'status-ok'}
      >
        {s.loading
          ? 'Loading port-call estimates…'
          : !s.snapshot
            ? 'PortWatch unavailable'
            : s.stale
              ? 'STALE · last available port estimates'
              : 'PortWatch · delayed port estimates'}
      </strong>
      {s.snapshot && (
        <p>
          {s.snapshot.feed.interval_start.slice(0, 10)} UTC ·{' '}
          {s.snapshot.events.length} regions · retrieved{' '}
          {formatTimestamp(s.snapshot.retrieved_at)}. Choose 7 days; older
          source days may fall outside the window.
        </p>
      )}
      {s.error && <p className="source-error">{s.error}</p>}
      {s.snapshot?.events.length === 0 && (
        <p>
          All selected regions are below the publication threshold. This does
          not mean no vessel activity.
        </p>
      )}
      <details className="disclosure">
        <summary>Maritime freshness & source details</summary>
        <div className="disclosure-body">
          <p>{MARITIME_COVERAGE}</p>
          <p>
            One bounded request per scheduled run; latest complete source day in
            a 14-day query, no archive. Same-origin checks every 15 minutes;
            retrieval stale after 45 minutes or failure. Provider generation,
            publication and revision times are unknown. Recent retrieval does
            not make the estimates current.
          </p>
          {s.health && (
            <p>
              Last pipeline attempt {formatTimestamp(s.health.attempted_at)} ·
              Status: {s.health.status}.
            </p>
          )}
          <p>{MARITIME_CREDIT}</p>
          <a href={MARITIME_TERMS} target="_blank" rel="noreferrer">
            IMF data reuse terms ↗
          </a>
          <button
            onClick={() => void s.refresh()}
            disabled={s.loading || s.offline || s.waitSeconds > 0}
          >
            Refresh maritime data
          </button>
        </div>
      </details>
    </div>
  )
}
