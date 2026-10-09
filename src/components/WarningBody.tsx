import type { WarningEvent } from '../data/dwd'
import { formatTimestamp } from '../data/events'
export default function WarningBody({
  event: e,
  stale,
}: {
  event: WarningEvent
  stale: boolean
}) {
  return (
    <>
      <p lang="de" className="detail-summary">
        {e.summary}
      </p>
      {e.instruction && (
        <p lang="de" style={{ whiteSpace: 'pre-line' }}>
          {e.instruction}
        </p>
      )}
      <h3>Source & provenance</h3>
      <p>
        Copyright Deutscher Wetterdienst ·{' '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        . GOSIP reformats and filters the source; original German wording
        retained. No endorsement.
      </p>
      <a href={e.source_url} target="_blank" rel="noreferrer">
        Open current DWD warnings ↗
      </a>
      <dl className="timestamps">
        <div>
          <dt>Valid from</dt>
          <dd>{formatTimestamp(e.valid_from)}</dd>
        </div>
        <div>
          <dt>Valid until</dt>
          <dd>
            {e.valid_until
              ? formatTimestamp(e.valid_until)
              : 'Not supplied; listed by source'}
          </dd>
        </div>
        <div>
          <dt>Feed generated</dt>
          <dd>{formatTimestamp(e.feed_generated_at)}</dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(e.collected_at)}</dd>
        </div>
        <div>
          <dt>Occurrence / publication / update</dt>
          <dd>Not supplied</dd>
        </div>
        <div>
          <dt>DWD level / district code</dt>
          <dd>
            {e.level} / {e.district}
          </dd>
        </div>
        <div>
          <dt>Altitude limits (m)</dt>
          <dd>
            {e.altitude_start ?? 'Not supplied'} →{' '}
            {e.altitude_end ?? 'Not supplied'}
          </dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>
            {stale
              ? 'STALE · retained warning, check DWD'
              : 'Recent source snapshot'}
          </dd>
        </div>
      </dl>
      <p>
        {e.coverage_note} Active and upcoming intervals intersect the selected
        forward window; expired warnings leave the view even if the snapshot is
        retained.
      </p>
    </>
  )
}
