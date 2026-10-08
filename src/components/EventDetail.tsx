import { useEffect, useRef } from 'react'
import { ArrowUpRight, CircleCheck, MapPin, X } from 'lucide-react'
import { categories, formatTimestamp, type DemoEvent } from '../data/events'

export default function EventDetail({
  event,
  onClose,
  onShowOnMap,
}: {
  event: DemoEvent
  onClose: () => void
  onShowOnMap: () => void
}) {
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
          {event.region} · {event.country}
        </p>
        <div className="simulation-note">
          <strong>SIMULATED EVENT</strong>
          <span>
            Invented for this prototype. Not a real-world report, alert, or
            verified observation.
          </span>
        </div>
        <p className="detail-summary">{event.summary}</p>
        <h3>
          Source & provenance <ArrowUpRight size={15} />
        </h3>
        <p className="source-name">{event.source_name}</p>
        <p className="muted text-sm">
          Original demo content · No external source report
        </p>
        <dl className="timestamps">
          <div>
            <dt>Scenario occurrence</dt>
            <dd>{formatTimestamp(event.occurred_at)}</dd>
          </div>
          <div>
            <dt>Scenario publication</dt>
            <dd>{formatTimestamp(event.published_at)}</dd>
          </div>
          <div>
            <dt>Fixture snapshot</dt>
            <dd>{formatTimestamp(event.collected_at)}</dd>
          </div>
          <div>
            <dt>Freshness</dt>
            <dd>Fixed demo · No live updates</dd>
          </div>
        </dl>
        <h3>What this tells you</h3>
        <p className="muted text-sm leading-6">
          {event.coverage_note} Coordinates are illustrative, not measured. No
          confidence estimate applies to synthetic content.
        </p>
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
