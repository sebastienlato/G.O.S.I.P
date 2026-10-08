import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Compass,
  Globe2,
  Info,
  Link,
  List,
  Map,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import WorldMap from './components/WorldMap'
import { categoryKeys } from './state/explorer'
import { useExplorerFilters } from './state/useExplorerFilters'
import EventDetail from './components/EventDetail'
import {
  categories,
  demoAge,
  demoProvider,
  filterEvents,
  type Category,
  type WindowHours,
} from './data/events'

const allEvents = demoProvider.getEvents()
const timeOptions: { value: WindowHours; label: string }[] = [
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
]

export default function App() {
  const [{ query, selectedCategories, hours, view, mapMode }, updateFilters] =
    useExplorerFilters()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{
    id: string
    sequence: number
  } | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [manualLink, setManualLink] = useState('')
  const about = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const mapRegion = useRef<HTMLDivElement>(null)
  const events = useMemo(
    () => filterEvents(allEvents, query, selectedCategories, hours),
    [query, selectedCategories, hours],
  )
  const selectedEvent = events.find((e) => e.id === selectedId)
  const detailEvent = events.find((e) => e.id === detailId)
  const selectEvent = useCallback((id: string) => {
    setSelectedId(id)
    setFocusRequest(null)
    setDetailId(id)
  }, [])
  const closeEvent = useCallback(() => setDetailId(null), [])
  useEffect(() => {
    if (selectedId && !events.some((event) => event.id === selectedId)) {
      setSelectedId(null)
      setDetailId(null)
      setFocusRequest(null)
    }
  }, [events, selectedId])
  useEffect(() => {
    setShareMessage('')
    setManualLink('')
  }, [query, selectedCategories, hours, view, mapMode])
  const reset = () =>
    updateFilters({ query: '', selectedCategories: categoryKeys, hours: 24 })
  const isFiltered =
    query.trim() !== '' ||
    selectedCategories.length !== categoryKeys.length ||
    hours !== 24
  function toggleCategory(category: Category) {
    updateFilters({
      selectedCategories: selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category],
    })
  }
  function showOnMap(id: string) {
    setDetailId(null)
    updateFilters({ view: 'map' })
    setFocusRequest((previous) => ({
      id,
      sequence: (previous?.sequence ?? 0) + 1,
    }))
    // Wait until dialog cleanup has restored focus and the map region is mounted.
    requestAnimationFrame(() => {
      mapRegion.current?.focus({ preventScroll: true })
      mapRegion.current?.scrollIntoView({ block: 'nearest' })
    })
  }
  function showInFeed() {
    const card = document.getElementById(`card-${selectedId}`)
    card?.focus({ preventScroll: true })
    card?.scrollIntoView({ block: 'nearest' })
  }
  async function shareFilters() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShareMessage('Link copied. Search text is included; selection is not.')
    } catch {
      setManualLink(url)
      setShareMessage('Copy this link to share the current filters.')
    }
  }

  return (
    <>
      <a className="skip-link" href="#event-feed">
        Skip to event feed
      </a>
      <header className="site-header">
        <a href="#" className="brand" aria-label="GOSIP home">
          <span className="brand-icon">
            <Globe2 size={25} strokeWidth={1.5} />
          </span>
          <span>
            GOSIP<span className="brand-period">.</span>
          </span>
        </a>
        <div className="brand-caption">
          GLOBAL OPEN SOURCE
          <br />
          INTELLIGENCE PLATFORM
        </div>
        <nav aria-label="Main navigation">
          <span className="nav-active">
            <Compass size={16} />
            Explorer
          </span>
          <button onClick={() => about.current?.showModal()}>
            <Info size={16} />
            About the project
          </button>
        </nav>
        <span className="header-access">
          <span />
          Open to everyone
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <span className="tiny-cross">+</span> A SHARED VIEW OF OUR WORLD
            </div>
            <h1>
              Global explorer<span>.</span>
            </h1>
            <p>Explore events. Find context. Stay curious.</p>
          </div>
          <div className="snapshot">
            <Clock3 size={17} />
            <div>
              <span>DEMO SNAPSHOT</span>
              <strong>
                08 OCT 2026 <span className="muted">/</span> 16:00 UTC
              </strong>
            </div>
          </div>
        </div>
        <div className="demo-banner">
          <span className="demo-badge">
            <Sparkles size={13} />
            SIMULATED
          </span>
          <p>
            You’re exploring an invented world of events.{' '}
            <span>No live data or real alerts.</span>
          </p>
          <button
            onClick={() => about.current?.showModal()}
            aria-label="About simulated data"
          >
            <Info size={17} />
          </button>
        </div>
        <div className="filter-bar" aria-label="Event filters">
          <div className="filter-label">
            <SlidersHorizontal size={16} />
            <span>Layers</span>
          </div>
          <div className="category-filters">
            <button
              className={`category-pill ${selectedCategories.length === categoryKeys.length ? 'active' : ''}`}
              aria-pressed={selectedCategories.length === categoryKeys.length}
              onClick={() =>
                updateFilters({ selectedCategories: categoryKeys })
              }
            >
              All events
            </button>
            {categoryKeys.map((key) => (
              <button
                key={key}
                className={`category-pill ${selectedCategories.includes(key) ? 'active' : ''}`}
                aria-pressed={selectedCategories.includes(key)}
                onClick={() => toggleCategory(key)}
              >
                <span
                  className="category-dot"
                  style={{ background: categories[key].color }}
                />
                {categories[key].label}
              </button>
            ))}
          </div>
          <button
            className="reset-filters"
            disabled={!isFiltered}
            onClick={reset}
          >
            Reset
          </button>
        </div>
        <div className={`explorer ${view === 'list' ? 'list-view' : ''}`}>
          <div className="explorer-controls">
            <div className="map-toolbar">
              <div className="map-toolbar-title">
                <Globe2 size={15} />
                <span>WORLD OVERVIEW</span>
                <span className="separator">/</span>
                <span>{events.length} signals</span>
              </div>
              <div className="view-switch" aria-label="Explorer view">
                <button
                  className={view === 'map' ? 'active' : ''}
                  aria-pressed={view === 'map'}
                  onClick={() => updateFilters({ view: 'map' })}
                >
                  <Map size={14} />
                  Map
                </button>
                <button
                  className={view === 'list' ? 'active' : ''}
                  aria-pressed={view === 'list'}
                  onClick={() => updateFilters({ view: 'list' })}
                >
                  <List size={14} />
                  List
                </button>
              </div>
            </div>
            <div className="time-panel">
              <div className="time-label">
                <Clock3 size={17} />
                <div>
                  <strong>Time window</strong>
                  <span>Before the demo snapshot</span>
                </div>
              </div>
              <div className="time-options" aria-label="Time window">
                {timeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={hours === option.value ? 'active' : ''}
                    aria-pressed={hours === option.value}
                    onClick={() => updateFilters({ hours: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="time-snapshot">
                <span className="status-dot" />
                Fixed snapshot
              </div>
            </div>
            <div className="filter-summary">
              <p>
                {selectedCategories.length} of 5 layers ·{' '}
                {timeOptions.find((option) => option.value === hours)?.label}{' '}
                before snapshot{query.trim() ? ` · “${query.trim()}”` : ''}
              </p>
              <button onClick={() => void shareFilters()}>
                <Link size={14} /> Copy view link
              </button>
              <a className="feed-jump" href="#event-feed">
                Jump to results ↓
              </a>
              <span aria-live="polite">{shareMessage}</span>
              {manualLink && (
                <input
                  aria-label="Shareable view link"
                  readOnly
                  value={manualLink}
                  onFocus={(e) => e.target.select()}
                />
              )}
            </div>
            {selectedEvent && (
              <div className="selection-context" aria-label="Selected event">
                <div>
                  <span className="eyebrow">SELECTED · SIMULATED</span>
                  <strong>{selectedEvent.title}</strong>
                  <p>
                    {selectedEvent.region} · {selectedEvent.country} ·
                    Approximate location
                  </p>
                </div>
                <div className="selection-actions">
                  <button onClick={() => setDetailId(selectedEvent.id)}>
                    Read details
                  </button>
                  <button onClick={() => showOnMap(selectedEvent.id)}>
                    Show on map
                  </button>
                  <button onClick={showInFeed}>Find in feed</button>
                  <button
                    aria-label="Clear selection"
                    onClick={() => {
                      showInFeed()
                      setSelectedId(null)
                      setFocusRequest(null)
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          {view === 'map' && (
            <div
              className="map-column"
              ref={mapRegion}
              tabIndex={-1}
              aria-label="Map and selected event"
            >
              <WorldMap
                events={events}
                selectedId={selectedEvent?.id ?? null}
                onSelect={selectEvent}
                focusRequest={focusRequest}
                staticView={mapMode === 'static'}
                onModeChange={(staticView) =>
                  updateFilters({
                    mapMode: staticView ? 'static' : 'interactive',
                  })
                }
              />
            </div>
          )}
          <section
            id="event-feed"
            tabIndex={-1}
            className="event-feed"
            aria-labelledby="feed-title"
          >
            <div className="feed-heading">
              <div>
                <h2 id="feed-title">
                  Event feed{' '}
                  <span>{events.length.toString().padStart(2, '0')}</span>
                </h2>
                <p>Discover the signals behind the map.</p>
              </div>
              <Activity size={19} className="muted" />
            </div>
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label="Search events"
                placeholder="Search events, regions, countries…"
                ref={search}
                aria-describedby="search-help"
                value={query}
                onChange={(e) => updateFilters({ query: e.target.value }, true)}
                maxLength={200}
              />
              {query && (
                <button
                  aria-label="Clear search"
                  onClick={() => {
                    updateFilters({ query: '' }, true)
                    search.current?.focus()
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <p id="search-help" className="search-help">
              Search titles, descriptions, regions and countries.
            </p>
            <div className="feed-meta">
              <span aria-live="polite" role="status">
                {events.length} simulated{' '}
                {events.length === 1 ? 'event' : 'events'}
              </span>
              <span>
                Most recent <ArrowDown size={12} />
              </span>
            </div>
            <div className="event-cards">
              {events.map((event) => (
                <button
                  className={`event-card ${event.id === selectedId ? 'is-selected' : ''}`}
                  id={`card-${event.id}`}
                  aria-current={event.id === selectedId ? 'true' : undefined}
                  key={event.id}
                  onClick={() => selectEvent(event.id)}
                  aria-label={`View ${event.title}`}
                >
                  <div className="card-top">
                    <span
                      className="card-category"
                      style={{ color: categories[event.category].color }}
                    >
                      <span
                        className="category-dot"
                        style={{ background: categories[event.category].color }}
                      />
                      {categories[event.category].label}
                    </span>
                    <span
                      className="event-age"
                      title="Before the fixed demo snapshot"
                    >
                      {demoAge(event.occurred_at)} before snapshot
                    </span>
                  </div>
                  <h3>
                    {event.title}
                    <ArrowUpRight size={15} />
                  </h3>
                  <p>
                    {event.region}
                    <span> / </span>
                    {event.country}
                  </p>
                  <div className="card-bottom">
                    <span>SIMULATED</span>
                    <span>
                      Demo source <ChevronRight size={12} />
                    </span>
                  </div>
                </button>
              ))}
              {!events.length && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>
                    {selectedCategories.length
                      ? 'No matching signals'
                      : 'All layers are off'}
                  </h3>
                  <p>
                    {!selectedCategories.length
                      ? 'Enable a layer to explore the simulated events.'
                      : query.trim()
                        ? `No examples match “${query.trim()}” with these layers and this time window. This is a small invented sample, not evidence of no activity.`
                        : 'No examples in this time window. Try the full seven-day demo sample.'}
                  </p>
                  <div className="empty-actions">
                    {!selectedCategories.length && (
                      <button
                        onClick={() =>
                          updateFilters({ selectedCategories: categoryKeys })
                        }
                      >
                        Enable all layers
                      </button>
                    )}
                    {query && (
                      <button
                        onClick={() => {
                          updateFilters({ query: '' }, true)
                          search.current?.focus()
                        }}
                      >
                        Clear search
                      </button>
                    )}
                    {hours !== 168 && (
                      <button onClick={() => updateFilters({ hours: 168 })}>
                        Explore 7 days
                      </button>
                    )}
                    <button onClick={reset}>Reset filters</button>
                  </div>
                </div>
              )}
            </div>
            <div className="feed-footer">
              <span className="status-dot" />
              Local fixtures · No live connection
            </div>
          </section>
        </div>
        <footer className="page-footer">
          <p>
            <Info size={13} />
            Illustrative coverage, not a complete picture. All locations are
            approximate.
          </p>
          <span>
            FREE ACCESS <span>·</span> SHARED UNDERSTANDING
          </span>
        </footer>
      </main>
      {detailEvent && (
        <EventDetail
          key={detailEvent.id}
          event={detailEvent}
          onShowOnMap={() => showOnMap(detailEvent.id)}
          onClose={closeEvent}
        />
      )}
      <dialog
        ref={about}
        className="about-dialog"
        aria-labelledby="about-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) about.current?.close()
        }}
      >
        <div className="detail-content">
          <div className="flex items-center justify-between">
            <span className="eyebrow">OPEN TO EVERYONE</span>
            <button
              className="icon-button"
              aria-label="Close about"
              onClick={() => about.current?.close()}
            >
              <X size={20} />
            </button>
          </div>
          <h2 id="about-title">
            A shared view.
            <br />
            An honest starting point.
          </h2>
          <p>
            GOSIP is a free global event explorer. This Phase 1 prototype
            contains 18 invented events across five categories. They are not
            reports of real activity.
          </p>
          <h3>Transparent by design</h3>
          <p>
            Time filters use a fixed snapshot: 8 October 2026 at 16:00 UTC.
            Every marker is approximate, every event is synthetic, and an empty
            region does not mean nothing is happening there.
          </p>
          <h3>Local. Free. Account-free.</h3>
          <p>
            The map, events, and interface are served locally. There are no
            external data requests, analytics, paid services, or live feeds. If
            the interactive map cannot render, a static map and the full event
            feed remain available.
          </p>
          <p className="muted text-sm">
            Base geography:{' '}
            <a
              href="https://www.naturalearthdata.com/about/terms-of-use/"
              target="_blank"
              rel="noreferrer"
            >
              Natural Earth public-domain data
            </a>
            , bundled via world-atlas. Boundaries are illustrative and may be
            outdated. No position on disputed borders is implied.
          </p>
        </div>
      </dialog>
    </>
  )
}
