import {
  additionalBases,
  additionalLayers,
  additionalReadout,
  type AdditionalEvent,
} from '../data/additional'
import { formatTimestamp, locationMeaning } from '../data/events'
export default function AdditionalBody({ event }: { event: AdditionalEvent }) {
  const intervalLabel =
    event.basis === 'planned-window'
      ? 'Planned validity'
      : event.basis === 'coverage-gap'
        ? 'Collection gap'
        : 'Sample interval'
  return (
    <>
      <p className="detail-summary">{event.summary}</p>
      <div className="digital-measurement">
        <span className="eyebrow">
          SIMULATED · {event.family.toUpperCase()}
        </span>
        <strong>{additionalBases[event.basis]}</strong>
        <p>{additionalReadout(event)}</p>
        <p>{additionalLayers[`${event.family}-demo`].caveat}</p>
      </div>
      <h3>Scenario times · UTC</h3>
      <dl className="timestamps">
        <div>
          <dt>{intervalLabel} start</dt>
          <dd>{formatTimestamp(event.interval_start)}</dd>
        </div>
        <div>
          <dt>{intervalLabel} end (exclusive)</dt>
          <dd>{formatTimestamp(event.interval_end)}</dd>
        </div>
        <div>
          <dt>Sample observation cutoff</dt>
          <dd>
            {event.observed_at
              ? `${formatTimestamp(event.observed_at)} · synthetic`
              : 'Not supplied · no observation asserted'}
          </dd>
        </div>
        <div>
          <dt>Scenario publication · window basis</dt>
          <dd>{formatTimestamp(event.published_at)}</dd>
        </div>
        <div>
          <dt>Scenario update</dt>
          <dd>
            {event.updated_at
              ? formatTimestamp(event.updated_at)
              : 'Not supplied'}
          </dd>
        </div>
        <div>
          <dt>Scenario retrieval / fixture snapshot</dt>
          <dd>{formatTimestamp(event.collected_at)}</dd>
        </div>
      </dl>
      <h3>Coverage & provenance</h3>
      <p className="source-name">
        {event.source_name} · original fictional content
      </p>
      <p className="muted text-sm leading-6">
        {locationMeaning(event)}. {event.coverage_note}
      </p>
      <p className="muted text-sm leading-6">{event.uncertainty}</p>
      <p className="report-label">
        Publication is not occurrence. Plans may extend beyond the cursor; no
        completed movement or current position is inferred. These independent
        examples have no supplied track relationships.
      </p>
    </>
  )
}
