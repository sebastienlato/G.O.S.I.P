import { type OoniEvent, OONI_LICENSE, OONI_CREDIT } from '../data/ooni'
import { formatTimestamp } from '../data/events'
export function OoniCredit() {
  return (
    <p>
      {OONI_CREDIT.attribution} ·{' '}
      <a href={OONI_LICENSE} target="_blank" rel="noreferrer">
        CC BY-NC-SA 4.0
      </a>
      . Selected and reformatted by GOSIP; adapted data under the same licence,
      separate from Apache-2.0 software. No endorsement.
    </p>
  )
}
export default function OoniBody({
  event,
  stale,
}: {
  event: OoniEvent
  stale: boolean
}) {
  return (
    <>
      <p className="detail-summary">{event.summary}</p>
      <dl className="timestamps">
        <div>
          <dt>Measurements</dt>
          <dd>
            {event.measurement_count.toLocaleString()} web-connectivity tests
          </dd>
        </div>
        <div>
          <dt>Collection interval (UTC day)</dt>
          <dd>
            {formatTimestamp(event.interval_start)} →{' '}
            {formatTimestamp(event.interval_end)} (end exclusive)
          </dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(event.collected_at)}</dd>
        </div>
        <div>
          <dt>Provider publication / update / generation</dt>
          <dd>Not supplied</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>
            {stale
              ? 'STALE · retained measurements'
              : 'Recent retrieval · delayed measurement day'}
          </dd>
        </div>
        <div>
          <dt>Network / contributor coverage</dt>
          <dd>Unknown; counts are tests, not unique networks or people</dd>
        </div>
      </dl>
      <p>{event.coverage_note}</p>
      <OoniCredit />
      <a href={event.source_url} target="_blank" rel="noreferrer">
        OONI country context ↗
      </a>
    </>
  )
}
