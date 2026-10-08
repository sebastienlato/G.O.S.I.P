import { isForecast } from '../data/weather'
import { useEffect, useRef } from 'react'
import { ArrowUpRight, CircleCheck, MapPin, X } from 'lucide-react'
import { categories, formatTimestamp, type ExplorerEvent } from '../data/events'

export default function EventDetail({
  event,
  stale,
  onClose,
  onShowOnMap,
}: {
  event: ExplorerEvent
  stale: boolean
  onClose: () => void
  onShowOnMap: () => void
}) {
  const forecast = isForecast(event)
  const quake = !event.is_demo && !forecast
  const thermal = 'kind' in event && event.kind === 'thermal'
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement as HTMLElement | null
    element?.showModal()
    return () => {
      element?.close()
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      aria-labelledby="detail-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="detail-content">
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            EVENT BRIEF / {event.id.toUpperCase()}
          </span>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close event details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="detail-category"
          style={{ color: categories[event.category].color }}
        >
          <span
            className="category-dot"
            style={{ background: categories[event.category].color }}
          />
          {categories[event.category].label}
        </div>
        <h2 id="detail-title">{event.title}</h2>
        <p className="detail-region">
          <MapPin size={15} />
          {event.region}
          {event.country ? ` · ${event.country}` : ''}
        </p>
        <div className="simulation-note">
          <strong>
            {event.is_demo
              ? 'SIMULATED EVENT'
              : forecast
                ? 'WEATHER FORECAST · NWS'
                : event.status === 'deleted'
                  ? 'WITHDRAWN BY PROVIDER'
                  : 'EARTHQUAKE OBSERVATION'}
          </strong>
          <span>
            {event.is_demo
              ? 'Invented for this prototype. Not a real-world report, alert, or verified observation.'
              : forecast
                ? 'Prediction for a future validity interval. Not a measurement, official alert, or confirmed impact. Check the current NWS source for warnings.'
                : 'Provider estimate subject to revision. Review status concerns source parameters, not verified damage, casualties or an emergency alert.'}
          </span>
        </div>
        <p className="detail-summary">{event.summary}</p>
        <h3>
          Source & provenance <ArrowUpRight size={15} />
        </h3>
        <p className="source-name">{event.source_name}</p>
        <p className="muted text-sm">
          {event.is_demo ? (
            'Original demo content · No external source report'
          ) : forecast ? (
            <a href={event.source_url} target="_blank" rel="noreferrer">
              Open NWS location forecast ↗
            </a>
          ) : (
            <>
              <a href={event.source_url} target="_blank" rel="noreferrer">
                Open USGS event page ↗
              </a>
              <br />
              Provider ID: {event.provider_id} · Network:{' '}
              {event.network ?? 'Not supplied'} · Code:{' '}
              {event.provider_code ?? 'Not supplied'}
            </>
          )}
        </p>
        <dl className="timestamps">
          <div>
            <dt>
              {event.is_demo
                ? 'Scenario occurrence'
                : forecast
                  ? 'Forecast valid from'
                  : 'Occurrence'}
            </dt>
            <dd>{formatTimestamp(event.occurred_at)}</dd>
          </div>
          <div>
            <dt>
              {event.is_demo ? 'Scenario publication' : 'Provider update'}
            </dt>
            <dd>
              {event.is_demo
                ? formatTimestamp(event.published_at)
                : event.updated_at
                  ? formatTimestamp(event.updated_at)
                  : 'Not supplied'}
            </dd>
          </div>
          <div>
            <dt>{event.is_demo ? 'Fixture snapshot' : 'Retrieved'}</dt>
            <dd>{formatTimestamp(event.collected_at)}</dd>
          </div>
          <div>
            <dt>Freshness</dt>
            <dd>
              {event.is_demo
                ? 'Fixed demo · No live updates'
                : stale
                  ? 'STALE · Check source / refresh'
                  : 'Recent snapshot · Manual refresh'}
            </dd>
          </div>
          {quake && (
            <>
              <div>
                <dt>Feed generated</dt>
                <dd>{formatTimestamp(event.feed_generated_at)}</dd>
              </div>
              <div>
                <dt>Provider review status</dt>
                <dd>{event.status ?? 'Not supplied'}</dd>
              </div>
              <div>
                <dt>Magnitude / type</dt>
                <dd>
                  {event.magnitude ?? 'Not supplied'} /{' '}
                  {event.magnitude_type ?? 'Not supplied'}
                </dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>
                  {event.depth_km == null
                    ? 'Not supplied'
                    : `${event.depth_km} km`}
                </dd>
              </div>
            </>
          )}
          {forecast && (
            <>
              <div>
                <dt>Forecast valid until</dt>
                <dd>{formatTimestamp(event.valid_until)}</dd>
              </div>
              <div>
                <dt>Forecast generated</dt>
                <dd>{formatTimestamp(event.feed_generated_at)}</dd>
              </div>
              <div>
                <dt>Temperature (period value)</dt>
                <dd>
                  {event.temperature == null
                    ? 'Not supplied'
                    : `${event.temperature} °${event.temperature_unit}`}
                </dd>
              </div>
              <div>
                <dt>Precipitation probability</dt>
                <dd>
                  {event.precipitation_percent == null
                    ? 'Not supplied'
                    : `${event.precipitation_percent}%`}
                </dd>
              </div>
              <div>
                <dt>Wind / direction</dt>
                <dd>
                  {event.wind ?? 'Not supplied'} /{' '}
                  {event.wind_direction ?? 'Not supplied'}
                </dd>
              </div>
            </>
          )}
          {thermal && (
            <>
              <div>
                <dt>Synthetic radiative power</dt>
                <dd>{event.radiative_power_mw} MW</dd>
              </div>
              <div>
                <dt>Synthetic brightness temperature</dt>
                <dd>{event.brightness_kelvin} K</dd>
              </div>
              <div>
                <dt>Invented detection confidence</dt>
                <dd>{event.confidence} · not probability of wildfire</dd>
              </div>
            </>
          )}
        </dl>
        <h3>What this tells you</h3>
        <p className="muted text-sm leading-6">
          {event.coverage_note}{' '}
          {event.is_demo
            ? 'Coordinates are illustrative, not measured. No confidence estimate applies to synthetic content.'
            : forecast
              ? 'Temperature is the supplied period value; read the forecast for high/low context. Precipitation probability is a chance, not rainfall amount. Missing values are not zero. No numerical temperature uncertainty is supplied. Periods share one marker; use the feed to inspect each.'
              : 'Markers show estimated epicentres. Location, depth and magnitude uncertainty values are not provided by this summary feed. Updates replace the current snapshot; revision history and deletion tracking are not available here.'}
        </p>
        {thermal && (
          <p className="muted text-sm leading-6">
            Radiative power (MW) describes radiant energy per time, not burned
            area or damage. Brightness temperature (K) is a radiometric
            quantity, not air temperature. These invented values model a
            VIIRS-like sample; no satellite acquired them. Broad markers are not
            pixel footprints or fire boundaries.
          </p>
        )}
        <button className="show-on-map" onClick={onShowOnMap}>
          <MapPin size={16} /> Show on map
        </button>
        <div className="detail-footer">
          <CircleCheck size={15} /> Free to explore. No account required.
        </div>
      </div>
    </dialog>
  )
}
