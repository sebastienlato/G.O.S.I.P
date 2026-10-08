import { isDigital, digitalExamples } from '../data/digital'
import { correctionRelationship, parseRelationships } from '../data/history'
import { type ExplorerEvent } from '../data/events'
import relationshipInput from '../data/relationships.json'
const relationships = parseRelationships(relationshipInput, digitalExamples)

export default function Relationships({
  event,
  onExplore,
}: {
  event: ExplorerEvent
  onExplore: (id: string) => void
}) {
  const correction = correctionRelationship(event)
  const comparisons = isDigital(event)
    ? relationships.filter((r) => r.from === event.id || r.to === event.id)
    : []
  return (
    <section className="relationships" aria-label="Evidence and relationships">
      <h3>Evidence & relationships</h3>
      {correction && (
        <div className="relationship-card">
          <strong>Supplied version relationship · SIMULATED</strong>
          <p>
            One earlier version → current corrected version of the same report.
          </p>
          <p>{correction.evidence}</p>
          <p className="history-note">
            Evidence: {correction.source}, supplied correction and prior text
            shown above. A superseded version is not an independent report.
          </p>
          {correction.url && (
            <a href={correction.url} target="_blank" rel="noreferrer">
              Read the original fixture evidence ↗
            </a>
          )}
        </div>
      )}
      {comparisons.map((r) => {
        const target = digitalExamples.find(
          (e) => e.id === (r.from === event.id ? r.to : r.from),
        )!
        return (
          <div className="relationship-card" key={r.id}>
            <strong>Authored teaching comparison · SIMULATED</strong>
            <p>{r.evidence}</p>
            <p className="history-note">
              Provenance: {r.author} · {r.id}. Supplied fixture IDs: {r.from} ↔{' '}
              {r.to}.
            </p>
            <button onClick={() => onExplore(target.id)}>
              Explore related example: {target.title}
            </button>
            <p className="history-note">
              Opens the full seven-day fixture snapshot and clears content/place
              filters to reveal this example.
            </p>
          </div>
        )
      })}
      {!correction && comparisons.length === 0 && (
        <p>
          No evidence-backed relationships supplied for this record. This is not
          proof that none exist.
        </p>
      )}
      <p className="history-note">
        Temporal proximity is not causation. Matching regions and repeated
        claims are not independent corroboration. These limited relationships do
        not establish cause, recovery, actors or complete coverage.
      </p>
    </section>
  )
}
