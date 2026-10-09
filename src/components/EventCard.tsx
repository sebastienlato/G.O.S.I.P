import { isFireSummary } from '../data/firms'
import { isWarning } from '../data/dwd'
import { isHazard, hazardKinds } from '../data/eonet'
import {
  additionalLayers,
  isAdditional,
  additionalReadout,
  additionalBases,
} from '../data/additional'
import {
  isDigital,
  digitalReadout,
  digitalResults,
  digitalFamilies,
} from '../data/digital'
import { isReport, reportLanguages } from '../data/reports'
import { isForecast } from '../data/weather'
import {
  categories,
  eventTime,
  demoAge,
  formatTimestamp,
  type ExplorerEvent,
} from '../data/events'
import { encode } from '../state/encoding'

type Props = {
  event: ExplorerEvent
  selected: boolean
  referenceTime: number
  /** Simulation clock: null for live data. */
  demoClock: 'snapshot' | 'cursor' | null
  onSelect: (id: string) => void
}

export function eventAge(
  event: ExplorerEvent,
  referenceTime: number,
  demoClock: Props['demoClock'],
) {
  if (isFireSummary(event)) return `Detected ${event.day} UTC · delayed ≥24h`
  if (isWarning(event))
    return `Valid ${formatTimestamp(event.valid_from)} → ${event.valid_until ? formatTimestamp(event.valid_until) : 'end not supplied'}`
  if (isForecast(event))
    return `Valid from ${formatTimestamp(event.occurred_at)}`
  if (isDigital(event) && Date.parse(event.interval_end) > referenceTime)
    return `Interval extends to ${formatTimestamp(event.interval_end)} · full fixture totals`
  const prefix = isHazard(event)
    ? 'Geometry dated '
    : isDigital(event)
      ? 'Interval ended '
      : isReport(event) || isAdditional(event)
        ? 'Published '
        : ''
  const suffix =
    demoClock === null
      ? 'ago'
      : demoClock === 'snapshot'
        ? 'before snapshot'
        : 'before cursor'
  return `${prefix}${demoAge(eventTime(event), referenceTime)} ${suffix}`
}

export default function EventCard({
  event,
  selected,
  referenceTime,
  demoClock,
  onSelect,
}: Props) {
  const enc = encode(event, referenceTime, eventTime(event))
  const hazard = isHazard(event)
  const quake = enc.kind === 'quake' && 'depth_km' in event ? event : null
  const label = isAdditional(event)
    ? additionalLayers[`${event.family}-demo`].label
    : categories[event.category].label
  return (
    <button
      className={`event-card kind-${enc.kind} ${selected ? 'is-selected' : ''}`}
      id={`card-${event.id}`}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(event.id)}
      aria-label={`View ${event.title}`}
      style={{ '--mark': enc.color } as React.CSSProperties}
    >
      <span className="card-mark" aria-hidden="true">
        {quake ? (
          <span className="card-magnitude">
            {quake.magnitude === null ? '–' : quake.magnitude.toFixed(1)}
          </span>
        ) : isFireSummary(event) ? (
          <span className="card-magnitude">{event.detection_count}</span>
        ) : (
          <span className={`glyph glyph-${enc.kind}`} />
        )}
      </span>
      <span className="card-body">
        <h3
          lang={
            isWarning(event)
              ? 'de'
              : isReport(event)
                ? event.source_language
                : undefined
          }
          dir="auto"
        >
          {quake ? quake.region : event.title}
        </h3>
        <span className="card-meta">
          <span>{eventAge(event, referenceTime, demoClock)}</span>
          {quake && quake.depth_km !== null && (
            <span>{Math.round(quake.depth_km)} km deep</span>
          )}
          {quake && (
            <span>
              USGS
              {quake.status === 'deleted'
                ? ' · withdrawn by provider'
                : quake.status
                  ? ` · ${quake.status}`
                  : ''}
            </span>
          )}
          {hazard && (
            <span>
              {event.hazard_categories.map((k) => hazardKinds[k]).join(' / ')} ·
              NASA EONET
            </span>
          )}
          {isWarning(event) && (
            <span>
              DWD · Level {event.level} · {event.region} · Germany · feed only
            </span>
          )}
          {isFireSummary(event) && (
            <span>NASA FIRMS · 2° cell · {event.region}</span>
          )}
          {!quake && !hazard && !isWarning(event) && !isFireSummary(event) && (
            <span>
              {label}
              {event.region ? ` · ${event.region}` : ''}
              {event.country ? ` / ${event.country}` : ''}
            </span>
          )}
        </span>
        {isAdditional(event) && (
          <span className="card-detail">
            <span>{additionalBases[event.basis]}</span>
            <span>{additionalReadout(event)}</span>
            <span>
              {event.basis === 'planned-window'
                ? 'Planned validity'
                : event.basis === 'coverage-gap'
                  ? 'Collection gap'
                  : 'Sample interval'}
              : {formatTimestamp(event.interval_start)} →{' '}
              {formatTimestamp(event.interval_end)}
            </span>
            <span>
              {event.coordinates ? 'Broad context only' : 'Not mapped'} · no
              real tracks
            </span>
          </span>
        )}
        {isDigital(event) && (
          <span className="card-detail">
            <span>{digitalResults[event.result]}</span>
            <span>{digitalReadout(event)}</span>
            <span>
              {digitalFamilies[event.family]} ·{' '}
              {event.coordinates ? 'Broad region' : 'Not mapped'}
            </span>
          </span>
        )}
        {isReport(event) && (
          <span className="card-detail">
            <span dir="auto">{event.source_name}</span>
            <span>
              Original · {reportLanguages[event.source_language]} (
              {event.source_language}) ·{' '}
              {event.translation
                ? 'Supplied translation'
                : 'No translation supplied'}
            </span>
            {event.correction && (
              <span className="correction-badge">
                Correction supplied · prior version available
              </span>
            )}
            {!event.coordinates && (
              <span>
                {event.location_precision === 'withheld'
                  ? 'Location withheld for safety'
                  : 'Location not supplied'}{' '}
                · not mapped
              </span>
            )}
          </span>
        )}
        {isForecast(event) && (
          <span className="card-detail">
            <span>
              {event.temperature == null
                ? 'Temperature not supplied'
                : `${event.temperature} °${event.temperature_unit}`}{' '}
              ·{' '}
              {event.precipitation_percent == null
                ? 'Precipitation chance not supplied'
                : `${event.precipitation_percent}% precipitation chance`}
            </span>
            <span>Valid until {formatTimestamp(event.valid_until)}</span>
          </span>
        )}
        {event.is_demo && <span className="sim-tag">Simulated</span>}
      </span>
    </button>
  )
}
