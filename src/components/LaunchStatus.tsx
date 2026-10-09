import type { useLaunches } from '../state/useEarthquakes'
import { formatTimestamp } from '../data/events'
import { LAUNCH_CREDIT } from '../data/launches'
export default function LaunchStatus({
  launches,
}: {
  launches: ReturnType<typeof useLaunches>
}) {
  const s = launches
  return (
    <div className="source-status" aria-label="Launch Library status">
      <strong
        aria-live="polite"
        className={!s.snapshot || s.stale ? 'status-warn' : 'status-ok'}
      >
        {s.loading
          ? 'Loading launch schedules…'
          : !s.snapshot
            ? 'Launch Library unavailable'
            : s.stale
              ? 'STALE · last available launch schedules'
              : 'Live catalog · scheduled launches'}
      </strong>
      {s.snapshot && (
        <p>
          {s.snapshot.events.length} selected schedules · retrieved{' '}
          {formatTimestamp(s.snapshot.retrieved_at)}. Window looks forward; try
          7 days.
        </p>
      )}
      {s.error && <p className="source-error">{s.error}</p>}
      {s.snapshot?.events.length === 0 && (
        <p>
          No eligible schedules in the bounded catalog. This does not mean no
          launches.
        </p>
      )}
      <details className="disclosure">
        <summary>Space freshness & source details</summary>
        <div className="disclosure-body">
          <p>
            Scheduled, never observed. Source time precision preserved; plans
            may change. Rounded launch-site context only; no spacecraft
            positions, trajectories, people or network movement.
          </p>
          {s.snapshot && (
            <p>
              Selected {s.snapshot.events.length} of the first{' '}
              {s.snapshot.feed.considered} upcoming entries; provider lists{' '}
              {s.snapshot.feed.total_upcoming} overall. Partial coverage:
              science, communications and technology/test types only. Unknown,
              military, crew and resupply categories and dates coarser than a
              day omitted. Unknown times stay source-listed in every window.
            </p>
          )}
          <p>
            One identified request per scheduled 15-minute run, no immediate
            retries. Same-origin page checks every 15 minutes; stale after 45
            minutes or failure. Retrieval is not a catalog update. Publication,
            occurrence and feed generation are unknown. Satellite orbits and
            NOAA space weather remain coming.
          </p>
          {s.health && (
            <p>
              Last pipeline attempt {formatTimestamp(s.health.attempted_at)} ·
              Status: {s.health.status}.
            </p>
          )}
          <p>{LAUNCH_CREDIT}</p>
          <a
            href="https://github.com/TheSpaceDevs/Tutorials/blob/main/faqs/faq_TSD.md"
            target="_blank"
            rel="noreferrer"
          >
            The Space Devs terms & coverage ↗
          </a>
          <button
            onClick={() => void s.refresh()}
            disabled={s.loading || s.offline || s.waitSeconds > 0}
          >
            Refresh space data
          </button>
        </div>
      </details>
    </div>
  )
}
