import type { FireSummary } from '../data/firms'
import { formatTimestamp } from '../data/events'
export default function FireBody({
  event: e,
  stale,
}: {
  event: FireSummary
  stale: boolean
}) {
  return (
    <>
      <p className="detail-summary">{e.summary}</p>
      <h3>Source & provenance</h3>
      <p>{e.source_name}. Aggregated by GOSIP.</p>
      <p>
        We acknowledge the use of NASA LANCE data, part of the Earth Science
        Data and Information System (ESDIS).{' '}
        <a
          href="https://www.earthdata.nasa.gov/data/projects/lance"
          target="_blank"
          rel="noreferrer"
        >
          NASA acknowledgment & disclaimer ↗
        </a>
        . Data provided as is; no endorsement.
      </p>
      <a href={e.source_url} target="_blank" rel="noreferrer">
        Open NASA FIRMS ↗
      </a>
      <dl className="timestamps">
        <div>
          <dt>Detection day (UTC)</dt>
          <dd>{e.day}</dd>
        </div>
        <div>
          <dt>Daily interval (exclusive end)</dt>
          <dd>
            {formatTimestamp(e.interval_start)} →{' '}
            {formatTimestamp(e.interval_end)}
          </dd>
        </div>
        <div>
          <dt>Detection count</dt>
          <dd>{e.detection_count} · not distinct fires</dd>
        </div>
        <div>
          <dt>Spatial aggregation</dt>
          <dd>2° × 2° cell · {e.region}</dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(e.collected_at)}</dd>
        </div>
        <div>
          <dt>Generation / publication / update</dt>
          <dd>Not supplied</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>
            {stale
              ? 'STALE · retained daily summary'
              : 'Recent retrieval · deliberately delayed observations'}
          </dd>
        </div>
      </dl>
      <p>{e.coverage_note}</p>
    </>
  )
}
