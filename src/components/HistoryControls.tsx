import type { ExplorerEvent } from '../data/events'
import { placeOptions } from '../data/history'
import type { ExplorerFilters } from '../state/explorer'
export default function HistoryControls({
  country,
  region,
  events,
  update,
}: {
  country: string
  region: string
  events: readonly ExplorerEvent[]
  update: (patch: Partial<ExplorerFilters>, replace?: boolean) => void
}) {
  const countries = placeOptions(events, 'country')
  const regions = placeOptions(events, 'region')
  return (
    <section className="history-panel" aria-label="Regional exploration">
      <div className="place-controls">
        <label>
          Country context
          <select
            aria-label="Country context"
            value={country}
            onChange={(e) => update({ country: e.target.value, region: '' })}
          >
            <option value="">All country contexts</option>
            {countries.map((name) => (
              <option key={name}>{name}</option>
            ))}
            <option value="~unknown">Country not supplied / withheld</option>
            {country &&
              country !== '~unknown' &&
              !countries.includes(country) && (
                <option value={country}>{country} (not in this source)</option>
              )}
          </select>
        </label>
        <label>
          Region context
          <select
            aria-label="Region context"
            value={region}
            onChange={(e) => update({ region: e.target.value })}
          >
            <option value="">All region contexts</option>
            {regions.map((name) => (
              <option key={name}>{name}</option>
            ))}
            {region && !regions.includes(region) && (
              <option value={region}>{region} (not in this source)</option>
            )}
          </select>
        </label>
        <button
          disabled={!country && !region}
          onClick={() => update({ country: '', region: '' })}
        >
          Clear place filters
        </button>
      </div>
      <p className="history-note">
        Exact supplied labels only; no country inferred from coordinates or
        place text. Unknown and withheld locations remain available. Context is
        not nationality, an incident position or nationwide impact. No results
        can mean missing coverage.
      </p>
    </section>
  )
}
