import {
  LAUNCH_CREDIT,
  launchTimeLabel,
  type LaunchEvent,
} from '../data/launches'
import { formatTimestamp } from '../data/events'
export default function LaunchBody({
  event,
  stale,
}: {
  event: LaunchEvent
  stale: boolean
}) {
  return (
    <>
      <p className="detail-summary">{event.summary}</p>
      <dl className="timestamps">
        <div>
          <dt>Schedule · NET (not earlier than)</dt>
          <dd>{launchTimeLabel(event)}</dd>
        </div>
        <div>
          <dt>Provider schedule status</dt>
          <dd>{event.status}</dd>
        </div>
        <div>
          <dt>Catalog updated</dt>
          <dd>
            {event.updated_at
              ? formatTimestamp(event.updated_at)
              : 'Not supplied'}
          </dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(event.collected_at)}</dd>
        </div>
        <div>
          <dt>Occurrence / publication / feed generation</dt>
          <dd>Unknown · no launch observation asserted</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>
            {stale
              ? 'STALE · retained schedule; plans may have changed'
              : 'Recent retrieval · plans may change'}
          </dd>
        </div>
        <div>
          <dt>Site context</dt>
          <dd>
            {event.region} ·{' '}
            {event.coordinates
              ? 'Rounded to 1°; not a spacecraft position'
              : 'No coordinates supplied'}
          </dd>
        </div>
      </dl>
      <p>{event.coverage_note}</p>
      <p>{LAUNCH_CREDIT}</p>
      <a href={event.source_url} target="_blank" rel="noreferrer">
        Launch Library 2 catalog entry ↗
      </a>
    </>
  )
}
