import type { HazardEvent } from '../data/eonet'
import { formatTimestamp } from '../data/events'
export default function HazardBody({
  event,
  stale,
  historical = false,
}: {
  event: HazardEvent
  stale: boolean
  historical?: boolean
}) {
  return (
    <>
      <p className="detail-summary">{event.summary}</p>
      <h3>Source & provenance</h3>
      <p>NASA EONET · {event.provider_id}</p>
      <p>
        <a href={event.source_url} target="_blank" rel="noreferrer">
          Open EONET catalog record ↗
        </a>
      </p>
      <p>References supplied by EONET; no corroboration claim:</p>
      <ul>
        {event.references.map((ref, i) => (
          <li key={i}>
            {ref.url ? (
              <a href={ref.url} target="_blank" rel="noreferrer">
                {ref.id} ↗
              </a>
            ) : (
              `${ref.id} · link unavailable (non-HTTPS)`
            )}
          </li>
        ))}
      </ul>
      <dl className="timestamps">
        <div>
          <dt>Latest geometry date</dt>
          <dd>{formatTimestamp(event.geometry_at)}</dd>
        </div>
        <div>
          <dt>Occurrence / publication / update</dt>
          <dd>Not supplied</dd>
        </div>
        <div>
          <dt>Catalog status</dt>
          <dd>{event.status} · approximate</dd>
        </div>
        <div>
          <dt>Catalog closed date</dt>
          <dd>
            {event.closed_at
              ? formatTimestamp(event.closed_at)
              : 'Not supplied · listed open'}
          </dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(event.collected_at)}</dd>
        </div>
        <div>
          <dt>Feed generated</dt>
          <dd>Not supplied</dd>
        </div>
        <div>
          <dt>Snapshot freshness</dt>
          <dd>
            {historical
              ? stale
                ? 'Stale / failed at capture'
                : 'Fresh at capture · curation age unknown'
              : stale
                ? 'STALE · check source'
                : 'Recently retrieved · curation age unknown'}
          </dd>
        </div>
        <div>
          <dt>Latest geometry magnitude / unit</dt>
          <dd>
            {event.magnitude ?? 'Not supplied'} /{' '}
            {event.magnitude_unit ?? 'Not supplied'}
          </dd>
        </div>
      </dl>
      <h3>What this tells you</h3>
      <p>
        {event.coverage_note} Magnitude units retain provider meaning; missing
        values are not zero. No severity, cause, casualties or affected area is
        inferred. Polygon records remain feed-only; no centroid is invented.
      </p>
    </>
  )
}
