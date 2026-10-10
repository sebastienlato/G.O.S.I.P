import { ageLabel, cadence, staleAfter } from '../data/cadence'
import type { SourceHealth } from '../data/published'
import { assetPath } from '../state/assetPath'
import { formatTimestamp } from '../data/events'
export function SourceCadence({
  source,
  state,
}: {
  source: SourceHealth['source']
  state: {
    now: number
    health: SourceHealth | null
    snapshot: { retrieved_at: string; generated_at: string | null } | null
    loading: boolean
    error: string
    stale: boolean
  }
}) {
  const c = cadence[source],
    { snapshot, health, now } = state
  const status = !snapshot
    ? state.loading
      ? 'Loading'
      : health || state.error
        ? 'Failed · no data'
        : 'Waiting'
    : state.error || health?.status !== 'ok'
      ? 'Failed check · retained data'
      : state.stale
        ? 'Stale'
        : now - Date.parse(snapshot.retrieved_at) > c.minutes * 60_000
          ? 'Overdue'
          : 'Retrieved'
  return (
    <div className="source-cadence">
      <p>
        <strong>{status}</strong> · Retrieval age{' '}
        {ageLabel(snapshot?.retrieved_at, now)}. Provider generation{' '}
        {snapshot?.generated_at
          ? `${formatTimestamp(snapshot.generated_at)} (${ageLabel(snapshot.generated_at, now)})`
          : 'unknown'}
        .
      </p>
      <p>
        {c.provider}. Pipeline target{' '}
        {c.minutes < 60 ? `${c.minutes} min` : `${c.minutes / 60} h`}; stale
        after {staleAfter(source) / 60_000} min or failure. {c.delay}.
      </p>
      <p>
        {c.scope}. Retrieval does not prove current provider content.{' '}
        <a href={c.url} target="_blank" rel="noreferrer">
          Source ↗
        </a>{' '}
        ·{' '}
        <a
          href={assetPath(`/data/${source}.json`)}
          target="_blank"
          rel="noreferrer"
        >
          Published JSON
        </a>
      </p>
    </div>
  )
}
