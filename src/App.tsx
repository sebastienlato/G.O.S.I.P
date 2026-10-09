import { isHazard, hazardKinds } from './data/eonet'
import PrivacySources from './components/PrivacySources'
import { localSourceAccess, PUBLIC_SOURCE_NOTE } from './state/sourceAccess'
import {
  additionalLayers,
  isAdditionalSource,
  additionalBySource,
  isAdditional,
  additionalReadout,
  additionalBases,
} from './data/additional'
import AdditionalSource from './components/AdditionalSource'
import HistoryControls from './components/HistoryControls'
import { matchesPlace } from './data/history'
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
import { useEarthquakes, useHazards } from './state/useEarthquakes'
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

const demoEvents = demoProvider
  .getEvents()
  .filter((event) => !['demo-001', 'demo-005', 'demo-008'].includes(event.id))
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
      liveLayers,
      language,
      reportStatus,
      digitalFamily,
      digitalResult,
      cursor,
      country,
      region,
    },
    updateFilters,
  ] = useExplorerFilters()
  const earthquakes = useEarthquakes(
    source === 'usgs' && liveLayers.includes('usgs'),
  )
  const hazards = useHazards(source === 'usgs' && liveLayers.includes('eonet'))
  const liveEvents = useMemo(
    () => [
      ...(liveLayers.includes('usgs')
        ? (earthquakes.snapshot?.events ?? [])
        : []),
      ...(liveLayers.includes('eonet') ? (hazards.snapshot?.events ?? []) : []),
    ],
    [liveLayers, earthquakes.snapshot, hazards.snapshot],
  )
  const weather = useWeather(source === 'nws')
  const additional = isAdditionalSource(source) ? source : null
  const digital = source === 'digital-demo'
  const reports = source === 'reports-demo'
  const isDemo =
    source === 'demo' ||
    source === 'fire-demo' ||
    reports ||
    digital ||
    additional !== null
  const sourceDisabled = source === 'nws' && !localSourceAccess
  const availableCategories: Category[] = additional
    ? [additionalLayers[additional].category]
    : source === 'demo'
      ? categoryKeys
      : source === 'usgs'
        ? ['physical', 'environment']
        : digital
          ? ['digital']
          : reports
            ? ['civic']
            : ['environment']
  const activeCategoryCount = availableCategories.filter((key) =>
    selectedCategories.includes(key),
  ).length
  const allEvents = additional
    ? additionalBySource[additional]
    : digital
      ? digitalExamples
      : reports
        ? reportExamples
        : source === 'demo'
          ? demoEvents
          : source === 'fire-demo'
            ? fireExamples
            : source === 'nws'
              ? (weather.snapshot?.events ?? noEvents)
              : liveEvents
  const referenceTime = isDemo
    ? (cursor ?? DEMO_TIME)
    : Math.floor(
        (source === 'nws'
          ? weather.now
          : Math.max(earthquakes.now, hazards.now)) / 60_000,
      ) * 60_000
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{
    id: string
    sequence: number
  } | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [manualLink, setManualLink] = useState('')
  const about = useRef<HTMLDialogElement>(null)
  const [privacyOnly, setPrivacyOnly] = useState(false)
  function openAbout(privacy = false) {
    setPrivacyOnly(privacy)
    about.current?.showModal()
    if (about.current) about.current.scrollTop = 0
  }
  const search = useRef<HTMLInputElement>(null)
  const mapRegion = useRef<HTMLDivElement>(null)
  const events = useMemo(
    () =>
      filterEvents(allEvents, query, selectedCategories, hours, referenceTime)
        .filter((event) => matchesPlace(event, country, region))
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
      country,
      region,
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
    cursor,
    country,
    region,
    selectedCategories,
    hours,
    view,
    mapMode,
    source,
    liveLayers,
    language,
    reportStatus,
    digitalFamily,
    digitalResult,
  ])
  const reset = () =>
    updateFilters({
      query: '',
      cursor: null,
      country: '',
      region: '',
      selectedCategories: categoryKeys,
      hours: 24,
      liveLayers: ['usgs', 'eonet'],
      language: 'all',
      reportStatus: 'all',
      digitalFamily: 'all',
      digitalResult: 'all',
    })
  const isFiltered =
    (source === 'usgs' && liveLayers.length !== 2) ||
    cursor !== null ||
    country !== '' ||
    region !== '' ||
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
          <button onClick={() => openAbout()}>
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
              <span>
                {isDemo
                  ? cursor === null
                    ? 'DEMO SNAPSHOT'
                    : 'SIMULATED PLAYBACK'
                  : sourceDisabled
                    ? 'SOURCE DISABLED'
                    : 'LIVE VIEW CLOCK'}
              </span>
              <strong>
                {isDemo && cursor === null ? (
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
        <div className="readiness-bar">
          <p>
            <strong>{isDemo ? 'Simulation lab' : 'Live public data'}</strong> ·
            Free access · No account or analytics
          </p>
          <button onClick={() => openAbout(true)}>
            Privacy & source licenses
          </button>
        </div>
        <FeedSource
          source={source}
          liveLayers={liveLayers}
          onToggle={(layer) =>
            updateFilters({
              liveLayers: liveLayers.includes(layer)
                ? liveLayers.filter((key) => key !== layer)
                : [...liveLayers, layer],
            })
          }
          hazards={hazards}
          counts={{
            usgs: events.filter((e) => !e.is_demo && !isHazard(e)).length,
            eonet: events.filter(isHazard).length,
          }}
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
        {!localSourceAccess && source === 'nws' && (
          <section
            className="feed-source source-status"
            aria-label="Source access status"
          >
            <strong>NWS · Coming to the public explorer</strong>
            <p>{PUBLIC_SOURCE_NOTE}</p>
            <div className="source-actions">
              <button
                onClick={() =>
                  updateFilters({
                    source: 'demo',
                    query: '',
                    selectedCategories: categoryKeys,
                  })
                }
              >
                Explore simulated examples
              </button>
              <a
                href={
                  'https://forecast.weather.gov/MapClick.php?lat=40.7128&lon=-74.0060'
                }
                target="_blank"
                rel="noreferrer"
              >
                Visit official provider ↗
              </a>
            </div>
          </section>
        )}
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
        {additional && <AdditionalSource source={additional} />}
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
              onClick={() => openAbout()}
              aria-label="About simulated data"
            >
              <Info size={17} />
            </button>
          </div>
        )}
        {!sourceDisabled && (
          <details key={source} open={isDemo} className="place-disclosure">
            <summary>Place filters & history</summary>
            <HistoryControls
              key={source}
              source={source}
              cursor={cursor}
              country={country}
              region={region}
              hours={hours}
              events={allEvents}
              suspended={!!detailId}
              update={updateFilters}
            />
          </details>
        )}
        <div className="filter-bar" aria-label="Event filters">
          <div className="filter-label">
            <SlidersHorizontal size={16} />
            <span>Categories</span>
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
                {additional
                  ? additionalLayers[additional].label
                  : categories[key].label}
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
            {source === 'usgs' && (
              <p className="report-map-note">
                {mapEvents.length} markers · {events.length - mapEvents.length}{' '}
                feed-only records. Windows use earthquake occurrence or EONET
                geometry dates.
              </p>
            )}
            {additional && (
              <p className="report-map-note">
                {mapEvents.length} broad context markers ·{' '}
                {events.length - mapEvents.length} examples not mapped. Markers
                are not tracks or current positions.
              </p>
            )}
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
                        : reports || additional
                          ? cursor === null
                            ? 'Published before the demo snapshot'
                            : 'Published before the playback cursor'
                          : cursor === null
                            ? 'Before the demo snapshot'
                            : 'Before the playback cursor'
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
                {isDemo
                  ? cursor === null
                    ? 'Fixed snapshot'
                    : 'Simulated cursor · UTC'
                  : 'Current time · UTC'}
              </div>
            </div>
            <div className="filter-summary">
              <p>
                {source === 'usgs' && `${liveLayers.length} live layers · `}
                {activeCategoryCount} of {availableCategories.length} categories
                · {timeOptions.find((option) => option.value === hours)?.label}{' '}
                {isDemo
                  ? digital
                    ? cursor === null
                      ? 'overlapping intervals before snapshot'
                      : 'overlapping intervals before cursor'
                    : cursor === null
                      ? 'before snapshot'
                      : 'before cursor'
                  : source === 'nws'
                    ? 'ahead · overlapping periods'
                    : 'before now'}
                {country &&
                  ` · Country: ${country === '~unknown' ? 'Not supplied / withheld' : country}`}
                {region && ` · Region: ${region}`}
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
                {additional
                  ? `simulated ${additionalLayers[additional].family}`
                  : digital
                    ? 'simulated digital'
                    : reports
                      ? 'simulated report'
                      : isDemo
                        ? 'simulated'
                        : source === 'nws'
                          ? 'NWS forecast'
                          : 'live'}{' '}
                {events.length === 1 ? 'event' : 'events'}
              </span>
              <span>
                {digital
                  ? 'Interval end · newest first'
                  : reports || additional
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
                      {isAdditional(event)
                        ? additionalLayers[`${event.family}-demo`].label
                        : categories[event.category].label}
                    </span>
                    <span
                      className="event-age"
                      title={
                        source === 'nws'
                          ? 'Forecast validity start (UTC)'
                          : isDemo
                            ? cursor === null
                              ? 'Before the fixed demo snapshot'
                              : 'Relative to the simulated cursor'
                            : 'Before the current clock'
                      }
                    >
                      {isForecast(event)
                        ? `Valid from ${formatTimestamp(event.occurred_at)}`
                        : isDigital(event) &&
                            Date.parse(event.interval_end) > referenceTime
                          ? `Interval extends to ${formatTimestamp(event.interval_end)} · full fixture totals`
                          : `${isHazard(event) ? 'Geometry dated ' : isDigital(event) ? 'Interval ended ' : isReport(event) || isAdditional(event) ? 'Published ' : ''}${demoAge(eventTime(event), referenceTime)} ${isDemo ? (cursor === null ? 'before snapshot' : 'before cursor') : 'ago'}`}
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
                    {isHazard(event)
                      ? event.hazard_categories
                          .map((key) => hazardKinds[key])
                          .join(' / ')
                      : event.region}
                    {event.country && (
                      <>
                        <span> / </span>
                        {event.country}
                      </>
                    )}
                  </p>
                  {isAdditional(event) && (
                    <div className="digital-card-meta">
                      <p>{additionalBases[event.basis]}</p>
                      <p>{additionalReadout(event)}</p>
                      <p>
                        {event.basis === 'planned-window'
                          ? 'Planned validity'
                          : event.basis === 'coverage-gap'
                            ? 'Collection gap'
                            : 'Sample interval'}
                        : {formatTimestamp(event.interval_start)} →{' '}
                        {formatTimestamp(event.interval_end)}
                      </p>
                      <p>
                        {event.coordinates
                          ? 'Broad context only'
                          : 'Not mapped'}{' '}
                        · no real tracks
                      </p>
                    </div>
                  )}
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
                    {sourceDisabled
                      ? 'Source disabled on this host'
                      : source === 'usgs' && !liveLayers.length
                        ? 'All live layers are off'
                        : selectedCategories.length
                          ? 'No matching signals'
                          : 'All layers are off'}
                  </h3>
                  <p>
                    {sourceDisabled
                      ? 'No provider data was loaded. Use the source panel above to choose a labeled simulation or visit the official provider.'
                      : digital
                        ? 'No digital examples match these filters. Change the measurement family or result, enable Digital world, clear search or widen the interval window. No data is not proof of connectivity or absence of blocking.'
                        : reports
                          ? 'No report examples match these filters. Try another language, clear the correction filter or widen the publication window. An empty result says nothing about real-world activity.'
                          : source === 'nws'
                            ? 'No forecast periods overlap this view. Check source status, enable Environment, clear search or widen the future window. This is not evidence of safe weather.'
                            : !isDemo
                              ? 'No records match this view. Check each source status, enable live layers and categories, clear search or widen the window. Missing data does not mean no hazards occurred.'
                              : !selectedCategories.length
                                ? 'Enable a layer to explore the simulated events.'
                                : query.trim()
                                  ? `No examples match “${query.trim()}” with these layers and this time window. This is a small invented sample, not evidence of no activity.`
                                  : 'No examples in this time window. Try the full seven-day demo sample.'}
                  </p>
                  {(country || region || cursor !== null) && (
                    <p>
                      Try clearing place filters or returning to the fixture
                      snapshot. The selected time or supplied location context
                      may have no records.
                    </p>
                  )}
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
                  : 'USGS / ANSS + NASA EONET · Distinct sources, no corroboration claim'}
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
          playback={cursor !== null}
          onExploreRelated={(id) => {
            updateFilters({
              cursor: null,
              hours: 168,
              country: '',
              region: '',
              query: '',
              selectedCategories: categoryKeys,
              digitalFamily: 'all',
              digitalResult: 'all',
              language: 'all',
              reportStatus: 'all',
            })
            setSelectedId(id)
            setDetailId(id)
            setFocusRequest(null)
          }}
          onShowOnMap={() => showOnMap(detailEvent.id)}
          stale={
            isHazard(detailEvent)
              ? hazards.stale
              : source === 'nws'
                ? weather.stale
                : earthquakes.stale
          }
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
              autoFocus
              className="icon-button"
              aria-label="Close about"
              onClick={() => about.current?.close()}
            >
              <X size={20} />
            </button>
          </div>
          {privacyOnly ? (
            <h2 id="about-title">Privacy & sources</h2>
          ) : (
            <>
              <h2 id="about-title">
                A shared view.
                <br />
                An honest starting point.
              </h2>
              <p>
                GOSIP combines USGS earthquakes and NASA EONET curated hazards
                from scheduled public snapshots, with independent layers and
                freshness. The separate simulation lab contains invented
                examples, never mixed with observations.
              </p>
              <h3>Transparent by design</h3>
              <p>
                Demo time is fixed at 8 October 2026, 16:00 UTC. Live filters
                use the current device clock and source-specific dates.
                Earthquake locations and magnitudes are estimates that may
                change; provider review does not verify impacts. An empty region
                does not mean nothing is happening there.
              </p>
            </>
          )}
          <PrivacySources />
        </div>
      </dialog>
    </>
  )
}
