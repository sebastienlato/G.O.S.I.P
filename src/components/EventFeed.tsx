import { forwardRef, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import EventCard from './EventCard'
import { eventBadge, locationMeaning, type ExplorerEvent } from '../data/events'

type Props = {
  events: ExplorerEvent[]
  mappedCount: number
  selectedEvent: ExplorerEvent | undefined
  referenceTime: number
  demoClock: 'snapshot' | 'cursor' | null
  query: string
  onQuery: (query: string) => void
  searchHelp: string
  countNoun: string
  orderLabel: string
  summary: string
  actions: React.ReactNode
  onSelect: (id: string) => void
  onReadDetails: (id: string) => void
  onShowOnMap: (id: string) => void
  onFindInFeed: () => void
  onClearSelection: () => void
  empty: React.ReactNode
  footer: string
}

/** Searchable, scannable list of every record in the current view. */
const EventFeed = forwardRef<HTMLInputElement, Props>(function EventFeed(
  {
    events,
    mappedCount,
    selectedEvent,
    referenceTime,
    demoClock,
    query,
    onQuery,
    searchHelp,
    countNoun,
    orderLabel,
    summary,
    actions,
    onSelect,
    onReadDetails,
    onShowOnMap,
    onFindInFeed,
    onClearSelection,
    empty,
    footer,
  },
  search,
) {
  const pageSize = 50
  const [page, setPage] = useState(0)
  const selectedIndex = selectedEvent
    ? events.findIndex((e) => e.id === selectedEvent.id)
    : -1
  useEffect(() => {
    setPage(selectedIndex < 0 ? 0 : Math.floor(selectedIndex / pageSize))
  }, [events, selectedEvent?.id, selectedIndex])
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(events.length / pageSize) - 1),
  )
  const visibleEvents = events.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  )
  const unmapped = events.length - mappedCount
  return (
    <section
      id="event-feed"
      tabIndex={-1}
      className="event-feed"
      aria-labelledby="feed-title"
    >
      <div className="feed-head">
        <h2 id="feed-title">
          <span className="feed-count">{events.length}</span>{' '}
          <span aria-live="polite" role="status">
            {countNoun}{' '}
            {demoClock === null
              ? events.length === 1
                ? 'record'
                : 'records'
              : events.length === 1
                ? 'event'
                : 'events'}
          </span>
        </h2>
        <p className="feed-summary">
          {summary}
          {unmapped > 0 && ` · ${unmapped} not on the map`}
        </p>
        {actions}
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Search events"
            placeholder="Search places, titles, countries"
            ref={search}
            aria-describedby="search-help"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            maxLength={200}
            type="search"
          />
          {query && (
            <button
              aria-label="Clear search"
              onClick={() => {
                onQuery('')
                ;(
                  search as React.RefObject<HTMLInputElement | null>
                ).current?.focus()
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <p id="search-help" className="search-help">
          {searchHelp} <span className="order">{orderLabel}</span>
        </p>
      </div>
      {selectedEvent && (
        <div className="selection-context" aria-label="Selected event">
          <div>
            <span className="selection-kicker">
              Selected ·{' '}
              {eventBadge(selectedEvent)
                .split(' ')
                .map((w) =>
                  ['USGS', 'EONET', 'NWS'].includes(w) ? w : w.toLowerCase(),
                )
                .join(' ')}
            </span>
            <strong dir="auto">{selectedEvent.title}</strong>
            <p>
              {selectedEvent.region}
              {selectedEvent.country
                ? ` · ${selectedEvent.country}`
                : ''} · {locationMeaning(selectedEvent)}
            </p>
          </div>
          <div className="selection-actions">
            <button onClick={() => onReadDetails(selectedEvent.id)}>
              Read details
            </button>
            <button
              disabled={!selectedEvent.coordinates}
              onClick={() => onShowOnMap(selectedEvent.id)}
            >
              Show on map
            </button>
            <button
              onClick={() => {
                setPage(Math.max(0, Math.floor(selectedIndex / pageSize)))
                requestAnimationFrame(onFindInFeed)
              }}
            >
              Find in feed
            </button>
            <button aria-label="Clear selection" onClick={onClearSelection}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {events.length > pageSize && (
        <nav className="feed-pagination" aria-label="Feed pages">
          <button
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span>
            {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, events.length)} of{' '}
            {events.length}
          </span>
          <button
            disabled={(currentPage + 1) * pageSize >= events.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </nav>
      )}
      <div className="event-cards">
        {visibleEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            selected={event.id === selectedEvent?.id}
            referenceTime={referenceTime}
            demoClock={demoClock}
            onSelect={onSelect}
          />
        ))}
        {!events.length && empty}
      </div>
      <p className="feed-footer">{footer}</p>
    </section>
  )
})
export default EventFeed
