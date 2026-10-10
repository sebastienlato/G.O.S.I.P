import type { useOoni } from '../state/useEarthquakes'
import { formatTimestamp } from '../data/events'
import { OoniCredit } from './OoniBody'
export default function OoniStatus({
  ooni,
}: {
  ooni: ReturnType<typeof useOoni>
}) {
  return (
    <div className="source-status" aria-label="OONI status">
      <strong
        aria-live="polite"
        className={!ooni.snapshot || ooni.stale ? 'status-warn' : 'status-ok'}
      >
        {ooni.loading
          ? 'Loading digital measurements…'
          : !ooni.snapshot
            ? 'OONI unavailable · no measurements loaded'
            : ooni.stale
              ? 'STALE · last available OONI measurements'
              : 'Live OONI · delayed daily measurements'}
      </strong>
      {ooni.snapshot && (
        <p>
          {ooni.snapshot.events.length} countries / territories · measurement
          day {ooni.snapshot.feed.interval_start.slice(0, 10)} UTC · retrieved{' '}
          {formatTimestamp(ooni.snapshot.retrieved_at)}. Auto includes the past
          3 days.
        </p>
      )}
      {ooni.error && <p className="source-error">{ooni.error}</p>}
      {ooni.snapshot?.events.length === 0 && (
        <p>
          No countries meet the publication threshold. This is not evidence of
          Internet availability.
        </p>
      )}
      <details className="disclosure">
        <summary>Digital freshness & source details</summary>
        <div className="disclosure-body">
          <p>
            OONI web-connectivity test counts, country/day aggregates delayed at
            least 24 hours. Voluntary and uneven coverage; no outage, censorship
            or intent inferred. No probe, network, URL, IP or outcome details
            published. Markers show country context only.
          </p>
          {ooni.snapshot && (
            <p>
              {ooni.snapshot.feed.reported_countries} countries / territories in
              the aggregate response;{' '}
              {ooni.snapshot.feed.reported_countries -
                ooni.snapshot.events.length}{' '}
              omitted below 1,000 measurements. This volume threshold does not
              establish unique contributors. No data means unknown coverage.
            </p>
          )}
          <p>
            One bounded provider request per scheduled 15-minute run; page
            checks every 15 minutes. Retrieval stale after 45 minutes or
            failure. Measurement day, retrieval and pipeline attempt are
            distinct; provider publication, update and generation are unknown.
          </p>
          {ooni.health && (
            <p>
              Last pipeline attempt {formatTimestamp(ooni.health.attempted_at)}{' '}
              · Status: {ooni.health.status}.
            </p>
          )}
          <OoniCredit />
          <a
            href="https://ooni.org/support/interpreting-ooni-data/"
            target="_blank"
            rel="noreferrer"
          >
            OONI interpretation & coverage ↗
          </a>
          <button
            onClick={() => void ooni.refresh()}
            disabled={ooni.loading || ooni.offline || ooni.waitSeconds > 0}
          >
            Refresh digital data
          </button>
        </div>
      </details>
    </div>
  )
}
