import {
  digitalFamilies,
  digitalReadout,
  digitalResults,
  type DigitalEvent,
} from '../data/digital'
import { formatTimestamp, locationMeaning } from '../data/events'

export default function DigitalBody({ event }: { event: DigitalEvent }) {
  return (
    <>
      <p className="detail-summary">{event.summary}</p>
      <div className="digital-measurement">
        <span className="eyebrow">
          SYNTHETIC VALUES · {digitalFamilies[event.family]}
        </span>
        <strong>{digitalResults[event.result]}</strong>
        <p>{digitalReadout(event)}</p>
        <p>An anomaly is not a confirmed outage or intentional censorship.</p>
      </div>
      <h3>Method & sample coverage</h3>
      <dl className="timestamps">
        <div>
          <dt>Method</dt>
          <dd>
            {event.method === 'active-probing'
              ? 'Active reachability probing · synthetic'
              : 'DNS / TCP / HTTP control comparison · synthetic'}
          </dd>
        </div>
        <div>
          <dt>Aggregation</dt>
          <dd>{event.aggregation}</dd>
        </div>
        <div>
          <dt>
            Returned {event.family === 'outage' ? 'time samples' : 'tests'}
          </dt>
          <dd>{event.sample_count ?? 'Not supplied'}</dd>
        </div>
        <div>
          <dt>Missing samples</dt>
          <dd>{event.missing_samples ?? 'Not supplied · not zero'}</dd>
        </div>
        <div>
          <dt>Country context</dt>
          <dd>{event.country || 'Not supplied'} · not population coverage</dd>
        </div>
        <div>
          <dt>Network context</dt>
          <dd>
            {event.network_asn === null
              ? 'Not supplied · not inferred from country'
              : `AS${event.network_asn} · fictional private-use network`}
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{locationMeaning(event)}</dd>
        </div>
        <div>
          <dt>Contributor / target information</dt>
          <dd>Probe IPs, contributor IDs and tested URLs omitted.</dd>
        </div>
      </dl>
      <h3>Scenario times · UTC</h3>
      <dl className="timestamps">
        <div>
          <dt>Measurement interval start</dt>
          <dd>{formatTimestamp(event.occurred_at)}</dd>
        </div>
        <div>
          <dt>Measurement interval end (exclusive)</dt>
          <dd>{formatTimestamp(event.interval_end)}</dd>
        </div>
        <div>
          <dt>Scenario publication</dt>
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
        <div>
          <dt>Baseline interval</dt>
          <dd>
            {event.baseline_start && event.baseline_end
              ? `${formatTimestamp(event.baseline_start)} – ${formatTimestamp(event.baseline_end)} (exclusive end)`
              : 'Not supplied · no baseline comparison'}
          </dd>
        </div>
      </dl>
      <h3>Uncertainty & provenance</h3>
      <p className="source-name">{event.source_name}</p>
      <p className="muted text-sm leading-6">
        {event.uncertainty} {event.coverage_note}
      </p>
      <p className="muted text-sm leading-6">
        {event.family === 'outage'
          ? 'Responding network blocks are not subscribers, users or all routable networks. Probe placement and response policies bias coverage.'
          : 'Volunteer coverage, repeated tests and target selection bias the sample. Anomaly counts are tests, not affected users or confirmed blocked sites. Transient errors and server behavior may produce false positives.'}{' '}
        No samples is not proof of connectivity or absence of blocking. No live
        updates.
      </p>
    </>
  )
}
