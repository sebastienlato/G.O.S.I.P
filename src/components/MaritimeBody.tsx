import {
  type MaritimeEvent,
  MARITIME_CREDIT,
  MARITIME_TERMS,
} from '../data/maritime'
import { formatTimestamp } from '../data/events'
export default function MaritimeBody({
  event,
  stale,
}: {
  event: MaritimeEvent
  stale: boolean
}) {
  return (
    <>
      <p className="detail-summary">{event.summary}</p>
      <dl className="timestamps">
        <div>
          <dt>Estimated activity day</dt>
          <dd>{event.interval_start.slice(0, 10)} UTC</dd>
        </div>
        <div>
          <dt>Port-call range</dt>
          <dd>
            {event.count}–{event.count + 9} · selected gateways
          </dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(event.collected_at)}</dd>
        </div>
        <div>
          <dt>Individual occurrence / publication / update / generation</dt>
          <dd>Unknown · daily estimates only</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>
            {stale
              ? 'STALE · retained estimates'
              : 'Recent retrieval · delayed source day'}
          </dd>
        </div>
      </dl>
      <p>{event.coverage_note}</p>
      <p>{MARITIME_CREDIT}</p>
      <a href={event.source_url} target="_blank" rel="noreferrer">
        IMF PortWatch source ↗
      </a>
      {' · '}
      <a href={MARITIME_TERMS} target="_blank" rel="noreferrer">
        Data reuse terms ↗
      </a>
    </>
  )
}
