import {
  isDigital,
  digitalExamples,
  digitalMatches,
  digitalReadout,
  digitalResults,
  digitalFamilies,
} from './data/digital'
import DigitalSource from './components/DigitalSource'
import { isReport, reportExamples, reportLanguages } from './data/reports'
import ReportSource from './components/ReportSource'
import EnvironmentSource from './components/EnvironmentSource'
import { useWeather } from './state/useWeather'
import { isForecast } from './data/weather'
import { fireExamples } from './data/fire'
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
import FeedSource from './components/FeedSource'
import { useEarthquakes } from './state/useEarthquakes'
import {
  categories,
  eventTime,
  hasCoordinates,
  DEMO_TIME,
  eventBadge,
  locationMeaning,
  formatTimestamp,
  type ExplorerEvent,
  demoAge,
  demoProvider,
  filterEvents,
  type Category,
  type WindowHours,
} from './data/events'

const demoEvents = demoProvider.getEvents()
const noEvents: ExplorerEvent[] = []
const timeOptions: { value: WindowHours; label: string }[] = [
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
]

export default function App() {
  const [
    {
      query,
      selectedCategories,
      hours,
      view,
      mapMode,
      source,
      language,
      reportStatus,
      digitalFamily,
      digitalResult,
    },
    updateFilters,
  ] = useExplorerFilters()
  const earthquakes = useEarthquakes(source === 'usgs')
  const weather = useWeather(source === 'nws')
  const digital = source === 'digital-demo'
  const reports = source === 'reports-demo'
  const isDemo =
    source === 'demo' || source === 'fire-demo' || reports || digital
  const availableCategories: Category[] =
    source === 'demo'
      ? categoryKeys
      : source === 'usgs'
        ? ['physical']
        : digital
          ? ['digital']
          : reports
            ? ['civic']
            : ['environment']
  const activeCategoryCount = availableCategories.filter((key) =>
    selectedCategories.includes(key),
  ).length
  const allEvents = digital
    ? digitalExamples
    : reports
      ? reportExamples
      : source === 'demo'
        ? demoEvents
        : source === 'fire-demo'
          ? fireExamples
          : source === 'nws'
            ? (weather.snapshot?.events ?? noEvents)
            : (earthquakes.snapshot?.events ?? noEvents)
  const referenceTime = isDemo
    ? DEMO_TIME
    : Math.floor((source === 'nws' ? weather.now : earthquakes.now) / 60_000) *
      60_000
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
    () =>
      filterEvents(allEvents, query, selectedCategories, hours, referenceTime)
        .filter(
          (event) =>
            !isReport(event) ||
            ((language === 'all' || event.source_language === language) &&
              (reportStatus === 'all' || event.correction !== null)),
        )
        .filter(
          (event) =>
            !isDigital(event) ||
            digitalMatches(event, digitalFamily, digitalResult),
        ),
    [
      allEvents,
      query,
      selectedCategories,
      hours,
      referenceTime,
      language,
      reportStatus,
      digitalFamily,
      digitalResult,
    ],
  )
  const selectedEvent = events.find((e) => e.id === selectedId)
  const mappedEvents = useMemo(() => events.filter(hasCoordinates), [events])
  const mapEvents = useMemo(
    () =>
      source === 'nws'
        ? selectedEvent && hasCoordinates(selectedEvent)
          ? [selectedEvent]
          : mappedEvents.slice(0, 1)
        : mappedEvents,
    [source, selectedEvent, mappedEvents],
  )
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
  }, [
    query,
    selectedCategories,
    hours,
    view,
    mapMode,
    source,
    language,
    reportStatus,
    digitalFamily,
    digitalResult,
  ])
  const reset = () =>
    updateFilters({
      query: '',
      selectedCategories: categoryKeys,
      hours: 24,
      language: 'all',
      reportStatus: 'all',
      digitalFamily: 'all',
      digitalResult: 'all',
    })
  const isFiltered =
    query.trim() !== '' ||
    selectedCategories.length !== categoryKeys.length ||
    hours !== 24 ||
    language !== 'all' ||
    reportStatus !== 'all' ||
    digitalFamily !== 'all' ||
    digitalResult !== 'all'
  function toggleCategory(category: Category) {
    updateFilters({
      selectedCategories: selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category],
    })
  }
  function showOnMap(id: string) {
    if (!events.find((event) => event.id === id)?.coordinates) return
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
              <span>{isDemo ? 'DEMO SNAPSHOT' : 'LIVE VIEW CLOCK'}</span>
              <strong>
                {isDemo ? (
                  <>
                    08 OCT 2026 <span className="muted">/</span> 16:00 UTC
                  </>
                ) : (
                  formatTimestamp(referenceTime)
                )}
              </strong>
            </div>
          </div>
        </div>
        <FeedSource
          source={source}
          onChange={(nextSource) => {
            updateFilters({
              source: nextSource,
              query: '',
              selectedCategories: categoryKeys,
            })
            setSelectedId(null)
            setDetailId(null)
            setFocusRequest(null)
          }}
          {...earthquakes}
        />
        <EnvironmentSource
          source={source}
          weather={weather}
          fallback={() =>
            updateFilters({
              source: 'fire-demo',
              query: '',
              selectedCategories: categoryKeys,
            })
          }
        />
        {digital && (
          <DigitalSource
            family={digitalFamily}
            result={digitalResult}
            onFamily={(digitalFamily) => updateFilters({ digitalFamily })}
            onResult={(digitalResult) => updateFilters({ digitalResult })}
          />
        )}
        {reports && (
          <ReportSource
            language={language}
            reportStatus={reportStatus}
            onLanguage={(language) => updateFilters({ language })}
            onStatus={(reportStatus) => updateFilters({ reportStatus })}
          />
        )}
        {isDemo && (
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
        )}
        <div className="filter-bar" aria-label="Event filters">
          <div className="filter-label">
            <SlidersHorizontal size={16} />
            <span>Layers</span>
          </div>
          <div className="category-filters">
            <button
              className={`category-pill ${activeCategoryCount === availableCategories.length ? 'active' : ''}`}
              aria-pressed={activeCategoryCount === availableCategories.length}
              onClick={() =>
                updateFilters({ selectedCategories: categoryKeys })
              }
            >
              All events
            </button>
            {availableCategories.map((key) => (
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
            {digital && (
              <p className="report-map-note">
                {mapEvents.length} broad regional markers ·{' '}
                {events.length - mapEvents.length} scenarios not mapped (unknown
                or withheld locations). All matching scenarios remain in the
                feed.
              </p>
            )}
            {reports && (
              <p className="report-map-note">
                {mapEvents.length} broad regional markers ·{' '}
                {events.length - mapEvents.length} reports not mapped (unknown
                or withheld locations). All matching reports remain in the feed.
              </p>
            )}

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
                  <span>
                    {isDemo
                      ? digital
                        ? 'Measurement intervals overlapping the past…'
                        : reports
                          ? 'Published before the demo snapshot'
                          : 'Before the demo snapshot'
                      : source === 'nws'
                        ? 'Forecast valid in the next…'
                        : 'Before the current clock'}
                  </span>
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
                {isDemo ? 'Fixed snapshot' : 'Current time · UTC'}
              </div>
            </div>
            <div className="filter-summary">
              <p>
                {activeCategoryCount} of {availableCategories.length} layers ·{' '}
                {timeOptions.find((option) => option.value === hours)?.label}{' '}
                {isDemo
                  ? digital
                    ? 'overlapping intervals before snapshot'
                    : 'before snapshot'
                  : source === 'nws'
                    ? 'ahead · overlapping periods'
                    : 'before now'}
                {query.trim() ? ` · “${query.trim()}”` : ''}
                {digital &&
                  ` · ${digitalFamily === 'all' ? 'All digital measurements' : digitalFamilies[digitalFamily]} · ${digitalResult === 'all' ? 'All results' : digitalResults[digitalResult]}`}
                {reports &&
                  ` · ${language === 'all' ? 'All languages' : reportLanguages[language]} · ${reportStatus === 'all' ? 'All reports' : 'With correction'}`}
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
                  <span className="eyebrow">
                    SELECTED · {eventBadge(selectedEvent)}
                  </span>
                  <strong>{selectedEvent.title}</strong>
                  <p>
                    {selectedEvent.region}
                    {selectedEvent.country
                      ? ` · ${selectedEvent.country}`
                      : ''}{' '}
                    · {locationMeaning(selectedEvent)}
                  </p>
                </div>
                <div className="selection-actions">
                  <button onClick={() => setDetailId(selectedEvent.id)}>
                    Read details
                  </button>
                  <button
                    disabled={!selectedEvent.coordinates}
                    onClick={() => showOnMap(selectedEvent.id)}
                  >
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
                events={mapEvents}
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
              {digital
                ? 'Search method, sample result, fictional ASN, region or country. No tested URLs or probe identities.'
                : reports
                  ? 'Search original titles, summaries, supplied translations, publishers, language codes, regions and countries.'
                  : 'Search titles, descriptions, regions and countries.'}
            </p>
            <div className="feed-meta">
              <span aria-live="polite" role="status">
                {events.length}{' '}
                {digital
                  ? 'simulated digital'
                  : reports
                    ? 'simulated report'
                    : isDemo
                      ? 'simulated'
                      : source === 'nws'
                        ? 'NWS forecast'
                        : 'USGS'}{' '}
                {events.length === 1 ? 'event' : 'events'}
              </span>
              <span>
                {digital
                  ? 'Interval end · newest first'
                  : reports
                    ? 'Publication · newest first'
                    : source === 'nws'
                      ? 'Soonest first'
                      : 'Most recent'}{' '}
                <ArrowDown size={12} />
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
                      title={
                        source === 'nws'
                          ? 'Forecast validity start (UTC)'
                          : isDemo
                            ? 'Before the fixed demo snapshot'
                            : 'Before the current clock'
                      }
                    >
                      {isForecast(event)
                        ? `Valid from ${formatTimestamp(event.occurred_at)}`
                        : `${isDigital(event) ? 'Interval ended ' : isReport(event) ? 'Published ' : ''}${demoAge(eventTime(event), referenceTime)} ${isDemo ? 'before snapshot' : 'ago'}`}
                    </span>
                  </div>
                  <h3
                    lang={isReport(event) ? event.source_language : undefined}
                    dir="auto"
                  >
                    {event.title}
                    <ArrowUpRight size={15} />
                  </h3>
                  <p>
                    {event.region}
                    {event.country && (
                      <>
                        <span> / </span>
                        {event.country}
                      </>
                    )}
                  </p>
                  {isDigital(event) && (
                    <div className="digital-card-meta">
                      <p>{digitalResults[event.result]}</p>
                      <p>{digitalReadout(event)}</p>
                      <p>
                        {digitalFamilies[event.family]} ·{' '}
                        {event.coordinates ? 'Broad region' : 'Not mapped'}
                      </p>
                    </div>
                  )}
                  {isReport(event) && (
                    <div className="report-card-meta">
                      <p dir="auto">{event.source_name}</p>
                      <p>
                        Original · {reportLanguages[event.source_language]} (
                        {event.source_language}) ·{' '}
                        {event.translation
                          ? 'Supplied translation'
                          : 'No translation supplied'}
                      </p>
                      {event.correction && (
                        <p className="correction-badge">
                          Correction supplied · prior version available
                        </p>
                      )}
                      {!event.coordinates && (
                        <p>
                          {event.location_precision === 'withheld'
                            ? 'Location withheld for safety'
                            : 'Location not supplied'}{' '}
                          · not mapped
                        </p>
                      )}
                    </div>
                  )}
                  {isForecast(event) && (
                    <p className="environment-readout">
                      {event.temperature == null
                        ? 'Temperature not supplied'
                        : `${event.temperature} °${event.temperature_unit}`}{' '}
                      ·{' '}
                      {event.precipitation_percent == null
                        ? 'Precipitation chance not supplied'
                        : `${event.precipitation_percent}% precipitation chance`}
                      <br />
                      Valid until {formatTimestamp(event.valid_until)}
                    </p>
                  )}
                  <div className="card-bottom">
                    <span>{eventBadge(event)}</span>
                    <span>
                      {isDemo ? 'Demo source' : 'Source details'}{' '}
                      <ChevronRight size={12} />
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
                    {digital
                      ? 'No digital examples match these filters. Change the measurement family or result, enable Digital world, clear search or widen the interval window. No data is not proof of connectivity or absence of blocking.'
                      : reports
                        ? 'No report examples match these filters. Try another language, clear the correction filter or widen the publication window. An empty result says nothing about real-world activity.'
                        : source === 'nws'
                          ? 'No forecast periods overlap this view. Check source status, enable Environment, clear search or widen the future window. This is not evidence of safe weather.'
                          : !isDemo
                            ? 'No observations match this view. Check the source status above, enable Earth & activity, clear search or widen the window. An empty result does not mean no earthquakes occurred.'
                            : !selectedCategories.length
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
              {isDemo
                ? 'Local fixtures · No live connection'
                : source === 'nws'
                  ? 'NWS · Predictions, not observations or alerts'
                  : earthquakes.snapshot
                    ? 'USGS / ANSS · Estimates subject to revision'
                    : 'USGS · No data loaded'}
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
          stale={source === 'nws' ? weather.stale : earthquakes.stale}
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
            GOSIP is a free global event explorer. Choose USGS earthquake
            observations, New York NWS forecasts, four synthetic fire examples,
            six multilingual report fixtures, six synthetic digital measurement
            scenarios, or 18 invented examples across five categories. Simulated
            examples are never mixed with real observations.
          </p>
          <h3>Transparent by design</h3>
          <p>
            Demo time is fixed at 8 October 2026, 16:00 UTC. USGS filters use
            the current device clock. Earthquake locations and magnitudes are
            estimates that may change; provider review does not verify impacts.
            An empty region does not mean nothing is happening there.
          </p>
          <h3>Local. Free. Account-free.</h3>
          <p>
            The map and interface are local. Selecting NWS makes two bounded
            requests to api.weather.gov, which receives your IP address; weather
            is held only in memory with manual hourly refresh. Forecast windows
            look forward; earthquake windows look back. Selecting USGS reuses a
            saved snapshot or sends a direct, credential-free request to
            earthquake.usgs.gov; that provider receives the usual connection
            information, including your IP address. No analytics, billing, or
            account is used. Refresh is manual and bounded. One validated
            snapshot is saved on this device for up to 24 hours; use the source
            panel to clear it. If the feed fails, explicitly choose the
            simulated fallback. Static map and list access remain available.
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
