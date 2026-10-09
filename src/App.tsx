import { isHazard } from './data/eonet'
import { localSourceAccess, PUBLIC_SOURCE_NOTE } from './state/sourceAccess'
import {
  additionalLayers,
  isAdditionalSource,
  additionalBySource,
} from './data/additional'
import AdditionalSource from './components/AdditionalSource'
import HistoryControls from './components/HistoryControls'
import { matchesPlace } from './data/history'
import {
  isDigital,
  digitalExamples,
  digitalMatches,
  digitalResults,
  digitalFamilies,
} from './data/digital'
import DigitalSource from './components/DigitalSource'
import { isReport, reportExamples, reportLanguages } from './data/reports'
import ReportSource from './components/ReportSource'
import EnvironmentSource from './components/EnvironmentSource'
import { useWeather } from './state/useWeather'
import { fireExamples } from './data/fire'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Info, Link, List, Map, Search, ShieldCheck } from 'lucide-react'
import WorldMap from './components/WorldMap'
import { categoryKeys } from './state/explorer'
import { useExplorerFilters } from './state/useExplorerFilters'
import EventDetail from './components/EventDetail'
import EventFeed from './components/EventFeed'
import AboutDialog from './components/AboutDialog'
import {
  LayerToggles,
  LiveStatus,
  SimulationLab,
} from './components/FeedSource'
import { useEarthquakes, useHazards } from './state/useEarthquakes'
import {
  categories,
  hasCoordinates,
  DEMO_TIME,
  formatTimestamp,
  type ExplorerEvent,
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
const minutesAgo = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  return m < 1
    ? 'just now'
    : m < 60
      ? `${m} min ago`
      : `${Math.floor(m / 60)} h ago`
}

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
  const live = source === 'usgs'
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
      : live
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
  const demoClock = isDemo ? (cursor === null ? 'snapshot' : 'cursor') : null
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
    (live && liveLayers.length !== 2) ||
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
  function changeSource(nextSource: typeof source) {
    updateFilters({
      source: nextSource,
      query: '',
      selectedCategories: categoryKeys,
    })
    setSelectedId(null)
    setDetailId(null)
    setFocusRequest(null)
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

  // Masthead clock and freshness.
  const clockLabel = isDemo
    ? cursor === null
      ? 'Demo snapshot'
      : 'Simulated playback'
    : sourceDisabled
      ? 'Source disabled'
      : 'Live view clock'
  const activeLive = live
    ? [
        liveLayers.includes('usgs') ? earthquakes : null,
        liveLayers.includes('eonet') ? hazards : null,
      ].filter((s) => s !== null)
    : []
  const retrievals = activeLive
    .map((s) => s.snapshot?.retrieved_at)
    .filter((t): t is string => !!t)
    .sort()
  const liveHealthy =
    activeLive.length > 0 && activeLive.every((s) => s.snapshot && !s.stale)
  const freshness = !live
    ? isDemo
      ? 'Invented examples, not live data'
      : null
    : !activeLive.length
      ? 'All live layers off'
      : retrievals.length
        ? `${liveHealthy ? 'Data' : 'Some data stale ·'} retrieved ${minutesAgo(retrievals[0], referenceTime)}`
        : activeLive.some((s) => s.loading)
          ? 'Loading live data…'
          : 'Live data unavailable'

  const windowLabel = timeOptions.find((o) => o.value === hours)?.label
  const windowSuffix = isDemo
    ? digital
      ? cursor === null
        ? 'overlapping intervals before snapshot'
        : 'overlapping intervals before cursor'
      : reports || additional
        ? cursor === null
          ? 'published before snapshot'
          : 'published before cursor'
        : cursor === null
          ? 'before snapshot'
          : 'before cursor'
    : source === 'nws'
      ? 'ahead · overlapping periods'
      : 'before now'
  const summary = [
    `${windowLabel} ${windowSuffix}`,
    live && `${liveLayers.length} of 2 live layers`,
    `${activeCategoryCount} of ${availableCategories.length} categories`,
    country &&
      `Country: ${country === '~unknown' ? 'Not supplied / withheld' : country}`,
    region && `Region: ${region}`,
    query.trim() && `“${query.trim()}”`,
    digital &&
      `${digitalFamily === 'all' ? 'All digital measurements' : digitalFamilies[digitalFamily]} · ${digitalResult === 'all' ? 'All results' : digitalResults[digitalResult]}`,
    reports &&
      `${language === 'all' ? 'All languages' : reportLanguages[language]} · ${reportStatus === 'all' ? 'All reports' : 'With correction'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const empty = (
    <div className="empty-state">
      <Search size={26} aria-hidden="true" />
      <h3>
        {sourceDisabled
          ? 'Source disabled on this host'
          : live && !liveLayers.length
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
                  ? 'Turn on a live layer, clear search or widen the window. Missing data does not mean no hazards occurred.'
                  : !selectedCategories.length
                    ? 'Enable a layer to explore the simulated events.'
                    : query.trim()
                      ? `No examples match “${query.trim()}” with these layers and this time window. This is a small invented sample, not evidence of no activity.`
                      : 'No examples in this time window. Try the full seven-day demo sample.'}
      </p>
      {(country || region || cursor !== null) && (
        <p>
          Try clearing place filters or returning to the fixture snapshot. The
          selected time or supplied location context may have no records.
        </p>
      )}
      <div className="empty-actions">
        {live && liveLayers.length < 2 && (
          <button
            onClick={() => updateFilters({ liveLayers: ['usgs', 'eonet'] })}
          >
            Turn on all live layers
          </button>
        )}
        {!selectedCategories.length && (
          <button
            onClick={() => updateFilters({ selectedCategories: categoryKeys })}
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
  )

  const viewActions = (
    <>
      <div className="view-actions">
        <button className="quiet" onClick={() => void shareFilters()}>
          <Link size={14} aria-hidden="true" /> Copy view link
        </button>
        <button
          className="quiet reset-filters"
          disabled={!isFiltered}
          onClick={reset}
        >
          Reset
        </button>
      </div>
      {(shareMessage || manualLink) && (
        <div className="share-note">
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
      )}
    </>
  )

  return (
    <>
      <a className="skip-link" href="#event-feed">
        Skip to event feed
      </a>
      <header className="masthead">
        <a href="#" className="brand" aria-label="GOSIP home">
          <span className="wordmark">GOSIP</span>
          <span className="brand-line">
            {isDemo
              ? 'Simulation lab'
              : 'Live earthquakes, storms and volcanoes'}
          </span>
        </a>
        <div
          className={`clock ${live ? (liveHealthy ? 'ok' : 'warn') : 'lab'}`}
        >
          <span className="clock-dot" aria-hidden="true" />
          <span className="clock-text">
            <span className="clock-label">{clockLabel}</span>
            <strong>{formatTimestamp(referenceTime)}</strong>
            {freshness && <span className="clock-fresh">{freshness}</span>}
          </span>
        </div>
        <nav className="masthead-actions" aria-label="Main navigation">
          <button onClick={() => openAbout()} aria-label="About the project">
            <Info size={16} aria-hidden="true" />
            <span className="wide-only">About</span>
          </button>
          <button
            onClick={() => openAbout(true)}
            aria-label="Privacy & source licenses"
          >
            <ShieldCheck size={16} aria-hidden="true" className="narrow-only" />
            <span className="privacy-word">Privacy</span>
            <span className="wide-only"> & source licenses</span>
          </button>
        </nav>
      </header>
      <main>
        <div className="rail" aria-label="Event filters" role="group">
          {live ? (
            <LayerToggles
              liveLayers={liveLayers}
              onToggle={(layer) =>
                updateFilters({
                  liveLayers: liveLayers.includes(layer)
                    ? liveLayers.filter((key) => key !== layer)
                    : [...liveLayers, layer],
                })
              }
              counts={{
                usgs: events.filter((e) => !e.is_demo && !isHazard(e)).length,
                eonet: events.filter(isHazard).length,
              }}
              quakes={earthquakes}
              hazards={hazards}
            />
          ) : (
            <button
              className="return-live"
              onClick={() => changeSource('usgs')}
            >
              Return to live layers
            </button>
          )}
          <div className="rail-scroll">
            <div
              className="rail-group category-filters"
              aria-label="Categories"
            >
              <button
                className={`category-pill ${activeCategoryCount === availableCategories.length ? 'active' : ''}`}
                aria-pressed={
                  activeCategoryCount === availableCategories.length
                }
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
                  {additional
                    ? additionalLayers[additional].label
                    : categories[key].label}
                </button>
              ))}
            </div>
            <div className="rail-group segmented" aria-label="Time window">
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
            <div className="rail-group segmented" aria-label="Explorer view">
              <button
                className={view === 'map' ? 'active' : ''}
                aria-pressed={view === 'map'}
                onClick={() => updateFilters({ view: 'map' })}
              >
                <Map size={14} aria-hidden="true" />
                Map
              </button>
              <button
                className={view === 'list' ? 'active' : ''}
                aria-pressed={view === 'list'}
                onClick={() => updateFilters({ view: 'list' })}
              >
                <List size={14} aria-hidden="true" />
                List
              </button>
            </div>
          </div>
        </div>
        {!live && (
          <div className="lab-strip">
            {isDemo && (
              <div className="demo-banner">
                <span className="demo-badge">Simulated</span>
                <p>
                  You’re exploring invented examples.{' '}
                  <span>No live data or real alerts.</span>
                </p>
                <button
                  className="icon-button"
                  onClick={() => openAbout()}
                  aria-label="About simulated data"
                >
                  <Info size={17} />
                </button>
              </div>
            )}
            {!localSourceAccess && source === 'nws' && (
              <section
                className="feed-source source-status"
                aria-label="Source access status"
              >
                <strong>NWS · Coming to the public explorer</strong>
                <p>{PUBLIC_SOURCE_NOTE}</p>
                <div className="source-actions">
                  <button onClick={() => changeSource('demo')}>
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
              fallback={() => changeSource('fire-demo')}
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
          </div>
        )}
        <div className={`stage ${view === 'list' ? 'list-view' : ''}`}>
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
                referenceTime={referenceTime}
                live={live}
                onModeChange={(staticView) =>
                  updateFilters({
                    mapMode: staticView ? 'static' : 'interactive',
                  })
                }
              />
            </div>
          )}
          <EventFeed
            ref={search}
            events={events}
            mappedCount={mapEvents.length}
            selectedEvent={selectedEvent}
            referenceTime={referenceTime}
            demoClock={demoClock}
            query={query}
            onQuery={(q) => updateFilters({ query: q }, true)}
            searchHelp={
              digital
                ? 'Search method, sample result, fictional ASN, region or country. No tested URLs or probe identities.'
                : reports
                  ? 'Search original titles, summaries, supplied translations, publishers, language codes, regions and countries.'
                  : 'Search titles, descriptions, regions and countries.'
            }
            countNoun={
              additional
                ? `simulated ${additionalLayers[additional].family}`
                : digital
                  ? 'simulated digital'
                  : reports
                    ? 'simulated report'
                    : isDemo
                      ? 'simulated'
                      : source === 'nws'
                        ? 'NWS forecast'
                        : 'live'
            }
            orderLabel={
              digital
                ? 'Newest interval end first.'
                : reports || additional
                  ? 'Newest publication first.'
                  : source === 'nws'
                    ? 'Soonest first.'
                    : 'Most recent first.'
            }
            summary={summary}
            actions={viewActions}
            onSelect={selectEvent}
            onReadDetails={(id) => setDetailId(id)}
            onShowOnMap={showOnMap}
            onFindInFeed={showInFeed}
            onClearSelection={() => {
              showInFeed()
              setSelectedId(null)
              setFocusRequest(null)
            }}
            empty={empty}
            footer={
              isDemo
                ? 'Local fixtures. No live connection.'
                : source === 'nws'
                  ? 'NWS predictions, not observations or alerts.'
                  : 'USGS / ANSS and NASA EONET are separate sources. GOSIP does not claim one confirms the other.'
            }
          />
        </div>
        <div className="below">
          {live && (
            <LiveStatus
              liveLayers={liveLayers}
              quakes={earthquakes}
              hazards={hazards}
            />
          )}
          {!sourceDisabled && (
            <details
              key={source}
              open={isDemo}
              className="place-disclosure disclosure"
            >
              <summary>Place filters & history</summary>
              <div className="disclosure-body">
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
              </div>
            </details>
          )}
          <SimulationLab source={source} onChange={changeSource} />
        </div>
        <footer className="page-footer">
          <p>
            Free and open to everyone. No account, ads or tracking. Locations
            are approximate and coverage is incomplete.
          </p>
          <p>
            Data: USGS / ANSS · NASA EONET · Natural Earth. Not an emergency
            service.
          </p>
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
      <AboutDialog ref={about} privacyOnly={privacyOnly} />
    </>
  )
}
