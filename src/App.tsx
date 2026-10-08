import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Compass,
  Globe2,
  Info,
  Layers3,
  List,
  Map,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import WorldMap from './components/WorldMap'
import EventDetail from './components/EventDetail'
import {
  categories,
  demoAge,
  demoProvider,
  filterEvents,
  type Category,
  type WindowHours,
} from './data/events'

const categoryKeys = Object.keys(categories) as Category[]
const allEvents = demoProvider.getEvents()
const timeOptions: { value: WindowHours; label: string }[] = [
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
]

export default function App() {
  const [query, setQuery] = useState('')
  const [selectedCategories, setSelectedCategories] =
    useState<Category[]>(categoryKeys)
  const [hours, setHours] = useState<WindowHours>(24)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const about = useRef<HTMLDialogElement>(null)
  const events = useMemo(
    () => filterEvents(allEvents, query, selectedCategories, hours),
    [query, selectedCategories, hours],
  )
  const selectedEvent = events.find((e) => e.id === selectedId)
  const selectEvent = useCallback((id: string) => setSelectedId(id), [])
  const closeEvent = useCallback(() => setSelectedId(null), [])
  const reset = () => {
    setQuery('')
    setSelectedCategories(categoryKeys)
    setHours(24)
  }
  const isFiltered =
    query.trim() !== '' ||
    selectedCategories.length !== categoryKeys.length ||
    hours !== 24
  function toggleCategory(category: Category) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    )
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
              onClick={() => setSelectedCategories(categoryKeys)}
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={200}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="feed-meta">
              <span aria-live="polite" role="status">
                {events.length} simulated events
              </span>
              <span>
                Most recent <ArrowDown size={12} />
              </span>
            </div>
            <div className="event-cards">
              {events.map((event) => (
                <button
                  className={`event-card ${event.id === selectedId ? 'is-selected' : ''}`}
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
                  <h3>No matching signals</h3>
                  <p>
                    Try another place or keyword, enable more layers, or widen
                    the time window.
                  </p>
                  <button onClick={reset}>Reset filters</button>
                </div>
              )}
            </div>
            <div className="feed-footer">
              <span className="status-dot" />
              Local fixtures · No live connection
            </div>
          </section>
          <div className="map-column">
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
                  onClick={() => setView('map')}
                >
                  <Map size={14} />
                  Map
                </button>
                <button
                  className={view === 'list' ? 'active' : ''}
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List size={14} />
                  List
                </button>
              </div>
            </div>
            {view === 'map' ? (
              <WorldMap
                events={events}
                selectedId={selectedId}
                onSelect={selectEvent}
              />
            ) : (
              <div className="list-context">
                <Layers3 size={32} />
                <h2>The world, one story at a time.</h2>
                <p>
                  The feed shows every matching event. Select a story to explore
                  its context and provenance.
                </p>
                <button onClick={() => setView('map')}>
                  Return to map <ArrowUpRight size={15} />
                </button>
              </div>
            )}
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
                    onClick={() => setHours(option.value)}
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
          </div>
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
      {selectedEvent && (
        <EventDetail
          key={selectedEvent.id}
          event={selectedEvent}
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
            GOSIP is a free global event explorer. This Phase 0 prototype
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
