import {
  additionalLayers,
  type AdditionalSource as Source,
} from '../data/additional'

export default function AdditionalSource({ source }: { source: Source }) {
  const layer = additionalLayers[source]
  return (
    <section
      className="feed-source report-source additional-source"
      aria-label={`${layer.label} coverage`}
    >
      <div className="source-status">
        <strong>SIMULATED · {layer.label}</strong>
        <p>
          Four original examples: a delayed sample, a future plan, a collection
          gap and an older sample. No live {layer.family} feed or real tracks.
        </p>
        <p>
          Publication drives the backward time window and newest-first order.
          Sample and planned intervals stay separate. Playback shows latest
          fixture content, not what was known then.
        </p>
        <div className="additional-legend" aria-label="Example time meanings">
          <span>Sample · invented aggregate</span>
          <span>Plan · completion unknown</span>
          <span>Gap · activity unknown</span>
        </div>
        <details>
          <summary>Coverage, units & privacy</summary>
          <p>{layer.caveat}</p>
          <p>
            Only broad context markers; no aircraft, vessel, satellite or
            facility positions, identifiers or routes. Country is supplied
            context, never nationality. Missing locations remain in the feed. No
            global completeness, independent corroboration or authoritative
            safety guidance.
          </p>
          <p>
            Original GOSIP fixture authors supply every value. Real provider
            reuse and access remain deferred; no external data, account, key,
            persistence or service was added.
          </p>
        </details>
      </div>
    </section>
  )
}
