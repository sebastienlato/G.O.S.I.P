import type { NewsEvent } from '../data/news'
import { formatTimestamp } from '../data/events'
export default function NewsBody({
  event: e,
  stale,
}: {
  event: NewsEvent
  stale: boolean
}) {
  return (
    <>
      <p>
        By {e.author} ·{' '}
        <a href={e.source_url} target="_blank" rel="noreferrer">
          Original Global Voices report ↗
        </a>
      </p>
      <p>
        English edition, as supplied ·{' '}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 3.0
        </a>
        . Headline and metadata selected and reformatted by GOSIP; no
        endorsement.
      </p>
      <dl className="timestamps">
        <div>
          <dt>Published by source</dt>
          <dd>{formatTimestamp(e.published_at)}</dd>
        </div>
        <div>
          <dt>Article update / claimed occurrence</dt>
          <dd>Not supplied</dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{formatTimestamp(e.collected_at)}</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>
            {stale
              ? 'STALE · retained metadata'
              : 'Recent retrieval · headline delayed at least 24 hours'}
          </dd>
        </div>
      </dl>
      <p>{e.coverage_note}</p>
      <p>
        One card per canonical publisher URL. Repeated links are rejected;
        separate articles are not grouped as corroborated events. Full text and
        media remain at the publisher.
      </p>
    </>
  )
}
