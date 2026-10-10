import { useArchive } from './state/useArchive'
import {
  archiveSources,
  captureEvents,
  capturedStale,
  pruneCaptures,
} from './data/archive'
import { ArchiveControls, ArchiveStatus } from './components/ArchiveControls'
import { isMaritime } from './data/maritime'
import { isLaunch } from './data/launches'
import { useLaunches, useMaritime } from './state/useEarthquakes'
import { isOoni } from './data/ooni'
import { useOoni } from './state/useEarthquakes'
import { isNews } from './data/news'
import { useNews } from './state/useEarthquakes'
import { isFireSummary } from './data/firms'
import { isWarning } from './data/dwd'
import { isHazard } from './data/eonet'
import HistoryControls from './components/HistoryControls'
import { matchesPlace } from './data/history'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Globe2, Info, Link, List, Search, ShieldCheck } from 'lucide-react'
import WorldMap from './components/WorldMap'
import {
  categoryKeys,
  liveLayerKeys,
  defaultLiveLayers,
  firmsAvailable,
  ooniAvailable,
  launchesAvailable,
  maritimeAvailable,
} from './state/explorer'
import { useExplorerFilters } from './state/useExplorerFilters'
import EventDetail from './components/EventDetail'
import EventFeed from './components/EventFeed'
import AboutDialog from './components/AboutDialog'
import { LayerToggles, LiveStatus } from './components/FeedSource'
import {
  useEarthquakes,
  useHazards,
  useWarnings,
  useFire,
} from './state/useEarthquakes'
import {
  categories,
  hasCoordinates,
  formatTimestamp,
  filterEvents,
  type Category,
  type WindowChoice,
} from './data/events'

const timeOptions: { value: WindowChoice; label: string; short: string }[] = [
  { value: 'auto', label: 'Auto · per-layer defaults', short: 'Auto' },
  { value: 6, label: '6 hours', short: '6 h' },
  { value: 24, label: '24 hours', short: '24 h' },
  { value: 72, label: '3 days', short: '3 d' },
  { value: 168, label: '7 days', short: '7 d' },
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
      coming,
      history,
      country,
      region,
    },
    updateFilters,
  ] = useExplorerFilters()
  const historical = source === 'usgs' && history !== ''
  const archiveState = useArchive(historical)
  const captures = useMemo(
    () => pruneCaptures(archiveState.archive?.captures ?? [], Date.now()),
    [archiveState.archive, Math.floor(Date.now() / 60_000)],
  )
  const capture = historical
    ? history === 'latest'
      ? captures.at(-1)
      : captures.find((c) => c.captured_at === history)
    : undefined
  useEffect(() => {
    if (historical && history === 'latest' && capture)
      updateFilters({ history: capture.captured_at }, true)
  }, [historical, history, capture, updateFilters])
  const archivedEvents = useMemo(
    () => captureEvents(capture, liveLayers),
    [capture, liveLayers],
  )
  const earthquakes = useEarthquakes(
    source === 'usgs' && !historical && liveLayers.includes('usgs'),
  )
  const hazards = useHazards(
    source === 'usgs' && !historical && liveLayers.includes('eonet'),
  )
  const warnings = useWarnings(
    source === 'usgs' && !historical && liveLayers.includes('dwd'),
  )
  const maritime = useMaritime(
    source === 'usgs' && !historical && liveLayers.includes('maritime'),
  )
  const launches = useLaunches(
    source === 'usgs' && !historical && liveLayers.includes('launches'),
  )
  const ooni = useOoni(
    source === 'usgs' && !historical && liveLayers.includes('ooni'),
  )
  const news = useNews(
    source === 'usgs' && !historical && liveLayers.includes('news'),
  )
  const fires = useFire(
    source === 'usgs' && !historical && liveLayers.includes('firms'),
  )
  const liveEvents = useMemo(
    () => [
      ...(liveLayers.includes('usgs')
        ? (earthquakes.snapshot?.events ?? [])
        : []),
      ...(liveLayers.includes('eonet') ? (hazards.snapshot?.events ?? []) : []),
      ...(liveLayers.includes('dwd') ? (warnings.snapshot?.events ?? []) : []),
      ...(liveLayers.includes('maritime')
        ? (maritime.snapshot?.events ?? [])
        : []),
      ...(liveLayers.includes('launches')
        ? (launches.snapshot?.events ?? [])
        : []),
      ...(liveLayers.includes('ooni') ? (ooni.snapshot?.events ?? []) : []),
      ...(liveLayers.includes('news') ? (news.snapshot?.events ?? []) : []),
      ...(liveLayers.includes('firms') ? (fires.snapshot?.events ?? []) : []),
    ],
    [
      liveLayers,
      earthquakes.snapshot,
      hazards.snapshot,
      warnings.snapshot,
      fires.snapshot,
      news.snapshot,
      ooni.snapshot,
      launches.snapshot,
      maritime.snapshot,
    ],
  )
  const live = true
  const availableCategories = categoryKeys
  const activeCategoryCount = availableCategories.filter((key) =>
    selectedCategories.includes(key),
  ).length
  const allEvents = historical ? archivedEvents : liveEvents
  const referenceTime =
    historical && capture
      ? Date.parse(capture.captured_at)
      : Math.floor(Math.max(earthquakes.now, hazards.now) / 60_000) * 60_000
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
      filterEvents(
        allEvents,
        query,
        selectedCategories,
        historical && hours === 'auto' ? 24 : hours,
        referenceTime,
      ).filter((event) => matchesPlace(event, country, region)),
    [
      allEvents,
      historical,
      country,
      region,
      query,
      selectedCategories,
      hours,
      referenceTime,
    ],
  )
  const selectedEvent = events.find((e) => e.id === selectedId)
  const mappedEvents = useMemo(() => events.filter(hasCoordinates), [events])
  const mapEvents = mappedEvents
  const detailEvent = events.find((e) => e.id === detailId)
  const selectEvent = useCallback((id: string) => {
    setSelectedId(id)
    setFocusRequest(null)
    setDetailId(id)
  }, [])
  // Choosing a record in the feed also flies the globe to it.
  const selectFromFeed = useCallback(
    (id: string) => {
      selectEvent(id)
      if (view === 'map' && mapMode !== 'static')
        setFocusRequest((previous) => ({
          id,
          sequence: (previous?.sequence ?? 0) + 1,
        }))
    },
    [selectEvent, view, mapMode],
  )
  useEffect(() => {
    setSelectedId(null)
    setDetailId(null)
    setFocusRequest(null)
  }, [history])
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
    country,
    region,
    selectedCategories,
    hours,
    view,
    mapMode,
    source,
    liveLayers,
  ])
  const reset = () =>
    updateFilters({
      query: '',
      coming: '',
      history: '',
      country: '',
      region: '',
      selectedCategories: categoryKeys,
      hours: 'auto',
      liveLayers: [...defaultLiveLayers],
    })
  const isFiltered =
    (live &&
      (liveLayers.length !== defaultLiveLayers.length ||
        liveLayers.some((key) => !defaultLiveLayers.includes(key)))) ||
    history !== '' ||
    coming !== '' ||
    country !== '' ||
    region !== '' ||
    query.trim() !== '' ||
    selectedCategories.length !== categoryKeys.length ||
    hours !== 'auto'
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

  // Masthead clock and freshness.
  const clockLabel = historical ? 'History capture' : 'Live view clock'
  const activeLive =
    live && !historical
      ? [
          liveLayers.includes('usgs') ? earthquakes : null,
          liveLayers.includes('eonet') ? hazards : null,
          liveLayers.includes('dwd') ? warnings : null,
          liveLayers.includes('firms') ? fires : null,
          liveLayers.includes('news') ? news : null,
          liveLayers.includes('ooni') ? ooni : null,
          liveLayers.includes('launches') ? launches : null,
          liveLayers.includes('maritime') ? maritime : null,
        ].filter((s) => s !== null)
      : []
  const retrievals = activeLive
    .map((s) => s.snapshot?.retrieved_at)
    .filter((t): t is string => !!t)
    .sort()
  const liveHealthy =
    activeLive.length > 0 && activeLive.every((s) => s.snapshot && !s.stale)
  const freshness = historical
    ? 'Archived data · not current'
    : !activeLive.length
      ? 'All live layers off'
      : retrievals.length
        ? `${liveHealthy ? 'Data' : 'Some data stale ·'} retrieved ${minutesAgo(retrievals[0], referenceTime)}`
        : activeLive.some((s) => s.loading)
          ? 'Loading live data…'
          : activeLive.some((s) => s.health || s.error)
            ? 'Live data unavailable'
            : 'Waiting for live data…'

  // Phones show the same status in two short words.
  const freshnessShort = historical
    ? 'Archived'
    : !activeLive.length
      ? 'Layers off'
      : retrievals.length
        ? `${liveHealthy ? 'Live' : 'Stale'} · ${minutesAgo(retrievals[0], referenceTime)}`
        : activeLive.some((s) => s.loading)
          ? 'Loading…'
          : activeLive.some((s) => s.health || s.error)
            ? 'Unavailable'
            : 'Waiting…'

  const windowLabel = timeOptions.find((o) => o.value === hours)?.label
  const windowSuffix =
    hours === 'auto'
      ? historical
        ? '· 24 hours before capture'
        : '· source-specific lookback / schedules ahead'
      : historical
        ? 'before capture'
        : 'back · warnings & launches ahead'
  const summary = [
    `${windowLabel} ${windowSuffix}`,
    live &&
      (historical
        ? `${liveLayers.filter((l) => archiveSources.includes(l as 'usgs' | 'eonet')).length} of 2 archived layers`
        : `${liveLayers.length} of ${liveLayerKeys.length} live layers`),
    `${activeCategoryCount} of ${availableCategories.length} categories`,
    country &&
      `Country: ${country === '~unknown' ? 'Not supplied / withheld' : country}`,
    region && `Region: ${region}`,
    query.trim() && `“${query.trim()}”`,
  ]
    .filter(Boolean)
    .join(' · ')

  const empty = (
    <div className="empty-state">
      <Search size={26} aria-hidden="true" />
      <h3>
        {coming
          ? `${coming === 'aviation' ? 'Aviation' : coming === 'weather' ? 'Broader weather' : coming[0].toUpperCase() + coming.slice(1)} · Coming`
          : historical
            ? 'No matching archived records'
            : !liveLayers.length
              ? 'All live layers are off'
              : 'No matching signals'}
      </h3>
      <p>
        {coming
          ? 'This source is not connected. No observations or sample records are substituted. Choose an available live layer to explore real data.'
          : historical
            ? 'This capture, layer selection or window has no matching records. Coverage is partial; missing history is not evidence of no activity.'
            : 'Turn on a live layer, clear search or widen the window. Delayed reports and digital measurements need 3 or 7 days. Missing data does not mean no activity occurred.'}
      </p>
      {(country || region) && (
        <p>
          Try clearing place filters or changing the selected time. The selected
          time or supplied location context may have no records.
        </p>
      )}
      <div className="empty-actions">
        {live && liveLayers.length < liveLayerKeys.length && (
          <button
            onClick={() =>
              updateFilters({ liveLayers: [...liveLayerKeys], coming: '' })
            }
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

  const healthyFeeds = activeLive.filter((s) => s.snapshot && !s.stale).length
  return (
    <>
      <a className="skip-link" href="#event-feed">
        Skip to event feed
      </a>
      <p className="classification">
        Unclassified <span>//</span> Open-source public data{' '}
        <span className="wide-only">
          <span>//</span> Not an emergency service
        </span>
      </p>
      <header className="masthead">
        <a href="#" className="brand" aria-label="GOSIP home">
          <span className="wordmark">GOSIP</span>
          <span className="brand-line">Global open source intelligence</span>
        </a>
        <div
          className={`clock ${live ? (liveHealthy ? 'ok' : 'warn') : 'lab'}`}
        >
          <span className="clock-dot" aria-hidden="true" />
          <span className="clock-text">
            <span className="clock-label">{clockLabel}</span>
            <strong>
              {live && !historical ? (
                <UtcClock />
              ) : (
                formatTimestamp(referenceTime)
              )}
            </strong>
            {freshness && (
              <span className="clock-fresh">
                <span className="fresh-full">{freshness}</span>
                <span className="fresh-short" aria-hidden="true">
                  {freshnessShort}
                </span>
              </span>
            )}
          </span>
          {live && activeLive.length > 0 && (
            <span className={`feed-health ${liveHealthy ? 'ok' : 'warn'}`}>
              Feeds {healthyFeeds}/{activeLive.length}{' '}
              {liveHealthy
                ? 'nominal'
                : activeLive.some((s) => s.snapshot || s.health || s.error)
                  ? 'degraded'
                  : 'standby'}
            </span>
          )}
        </div>
        <nav className="masthead-actions" aria-label="Main navigation">
          <button onClick={() => openAbout()} aria-label="About the project">
            <Info size={15} aria-hidden="true" />
            <span className="wide-only">About</span>
          </button>
          <button
            onClick={() => openAbout(true)}
            aria-label="Privacy & source licenses"
          >
            <ShieldCheck size={15} aria-hidden="true" />
            <span className="privacy-word">Privacy</span>
            <span className="wide-only"> & source licenses</span>
          </button>
        </nav>
      </header>
      <main className={`console ${view === 'list' ? 'list-view' : ''}`}>
        <div className="globe-area">
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
        </div>
        <div className="left-stack">
          <section
            className="panel panel-controls rail"
            aria-label="Event filters"
            role="group"
          >
            <h2 className="panel-title">
              {historical ? 'Archived layers' : 'Live layers'}
            </h2>
            <LayerToggles
              historyCapture={historical ? (capture ?? null) : undefined}
              liveLayers={liveLayers}
              onToggle={(layer) =>
                updateFilters({
                  coming: '',
                  liveLayers: liveLayers.includes(layer)
                    ? liveLayers.filter((key) => key !== layer)
                    : [...liveLayers, layer],
                })
              }
              counts={{
                usgs: events.filter(
                  (e) =>
                    !e.is_demo &&
                    !isHazard(e) &&
                    !isWarning(e) &&
                    !isFireSummary(e) &&
                    !isMaritime(e) &&
                    !isNews(e) &&
                    !isOoni(e) &&
                    !isLaunch(e),
                ).length,
                eonet: events.filter(isHazard).length,
                dwd: events.filter(isWarning).length,
                firms: events.filter(isFireSummary).length,
                news: events.filter(isNews).length,
                ooni: events.filter(isOoni).length,
                launches: events.filter(isLaunch).length,
                maritime: events.filter(isMaritime).length,
              }}
              quakes={earthquakes}
              hazards={hazards}
              warnings={warnings}
              fires={fires}
              news={news}
              ooni={ooni}
              launches={launches}
              maritime={maritime}
            />
            {live && (
              <>
                <h2 className="panel-title">Time</h2>
                <div
                  className="rail-group segmented"
                  aria-label="Data time mode"
                >
                  <button
                    aria-pressed={!historical}
                    className={!historical ? 'active' : ''}
                    onClick={() => updateFilters({ history: '' })}
                  >
                    Current
                  </button>
                  <button
                    aria-pressed={historical}
                    className={historical ? 'active' : ''}
                    onClick={() =>
                      updateFilters({ history: 'latest', coming: '' })
                    }
                  >
                    History
                  </button>
                </div>
                {historical && (
                  <ArchiveControls
                    captures={captures}
                    selected={capture}
                    value={history}
                    onChange={(history) => updateFilters({ history })}
                  />
                )}
              </>
            )}
            <h2 className="panel-title">Window</h2>
            <div className="rail-group segmented" aria-label="Time window">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  aria-label={option.label}
                  className={hours === option.value ? 'active' : ''}
                  aria-pressed={hours === option.value}
                  onClick={() => updateFilters({ hours: option.value })}
                >
                  {option.short}
                </button>
              ))}
            </div>
            {hours === 'auto' && !historical && (
              <details className="window-details">
                <summary>Layer windows</summary>
                <p>
                  Quakes, thermal and warnings: 24 h. Reports: 7 d. Digital: 3
                  d. Maritime: 14 d. Hazards and space: 30 d. Warnings and
                  launches look ahead. Real-clock limits still apply to stale
                  data; an empty source stays empty.
                </p>
              </details>
            )}
            <h2 className="panel-title">View</h2>
            <div className="rail-group segmented" aria-label="Explorer view">
              <button
                className={view === 'map' ? 'active' : ''}
                aria-pressed={view === 'map'}
                onClick={() => updateFilters({ view: 'map' })}
              >
                <Globe2 size={14} aria-hidden="true" />
                Globe
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
            <details className="category-menu disclosure">
              <summary>Categories · {activeCategoryCount}</summary>
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
                    {categories[key].label}
                  </button>
                ))}
              </div>
            </details>
          </section>
          <section
            className="panel panel-reference"
            aria-label="Sources and context"
          >
            {live && !historical && (
              <LiveStatus
                liveLayers={liveLayers}
                quakes={earthquakes}
                hazards={hazards}
                warnings={warnings}
                fires={fires}
                news={news}
                ooni={ooni}
                launches={launches}
                maritime={maritime}
              />
            )}
            {historical && (
              <ArchiveStatus
                {...archiveState}
                captures={captures}
                selected={capture}
              />
            )}
            <details className="place-disclosure disclosure">
              <summary>Place filters</summary>
              <HistoryControls
                country={country}
                region={region}
                events={allEvents}
                update={updateFilters}
              />
            </details>
            <footer className="page-footer">
              <p>
                Free and open to everyone. No account, ads or tracking.
                Locations are approximate and coverage is incomplete.
              </p>
              <p>
                Data: USGS / ANSS · NASA EONET · DWD
                {firmsAvailable && ' · NASA FIRMS'} · Global Voices
                {ooniAvailable && ' · OONI'}
                {maritimeAvailable && ' · IMF PortWatch'}
                {launchesAvailable && ' · The Space Devs'} · Natural Earth.
                Imagery: NASA GIBS / Cesium ion. Not an emergency service.
              </p>
            </footer>
          </section>
        </div>
        <div className="panel panel-feed">
          <EventFeed
            ref={search}
            events={events}
            mappedCount={mapEvents.length}
            selectedEvent={selectedEvent}
            referenceTime={referenceTime}
            demoClock={null}
            query={query}
            onQuery={(q) => updateFilters({ query: q }, true)}
            searchHelp="Search titles, descriptions, regions and countries."
            countNoun={historical ? 'archived' : 'live'}
            orderLabel={
              historical
                ? 'Most recent first.'
                : `${liveLayers.includes('launches') ? 'Launches soonest, then newest' : 'Newest'} first${
                    liveLayers.includes('firms') && firmsAvailable
                      ? '; thermal cells last, busiest first'
                      : ''
                  }.`
            }
            summary={summary}
            actions={viewActions}
            onSelect={selectFromFeed}
            onReadDetails={(id) => setDetailId(id)}
            onShowOnMap={showOnMap}
            onFindInFeed={showInFeed}
            onClearSelection={() => {
              showInFeed()
              setSelectedId(null)
              setFocusRequest(null)
            }}
            empty={empty}
            footer="Sources remain independent. Detection counts are not confirmed fires; warnings are not observed impacts; reports are attributed claims; digital counts are measurements, not outages; launches are schedules, not observations."
          />
        </div>
      </main>
      {detailEvent && (
        <EventDetail
          key={detailEvent.id}
          event={detailEvent}
          playback={false}
          historyCapture={capture?.captured_at}
          onShowOnMap={() => showOnMap(detailEvent.id)}
          stale={
            historical
              ? !capture ||
                capturedStale(capture, isHazard(detailEvent) ? 'eonet' : 'usgs')
              : isMaritime(detailEvent)
                ? maritime.stale
                : isLaunch(detailEvent)
                  ? launches.stale
                  : isOoni(detailEvent)
                    ? ooni.stale
                    : isNews(detailEvent)
                      ? news.stale
                      : isFireSummary(detailEvent)
                        ? fires.stale
                        : isWarning(detailEvent)
                          ? warnings.stale
                          : isHazard(detailEvent)
                            ? hazards.stale
                            : earthquakes.stale
          }
          onClose={closeEvent}
        />
      )}
      <AboutDialog ref={about} privacyOnly={privacyOnly} />
    </>
  )
}

/** Ticking UTC clock for the live console (seconds precision). */
function UtcClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const d = new Date(now)
  return (
    <time dateTime={d.toISOString()}>
      {d.toISOString().slice(0, 10)} {d.toISOString().slice(11, 19)} UTC
    </time>
  )
}
