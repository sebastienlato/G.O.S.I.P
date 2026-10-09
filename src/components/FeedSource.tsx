import { localSourceAccess } from '../state/sourceAccess'
import { additionalLayers, type AdditionalSource } from '../data/additional'
import type {
  useHazards,
  useEarthquakes,
  useWarnings,
  useFire,
  useNews,
} from '../state/useEarthquakes'
import {
  liveLayerKeys,
  firmsAvailable,
  type LiveLayer,
  type Source,
} from '../state/explorer'
import { formatTimestamp } from '../data/events'
import {
  hazardColors,
  magnitudeSteps,
  warningColor,
  fireColor,
  newsColor,
} from '../state/encoding'

type News = ReturnType<typeof useNews>
type Quakes = ReturnType<typeof useEarthquakes>
type Fires = ReturnType<typeof useFire>
type Warnings = ReturnType<typeof useWarnings>
type Hazards = ReturnType<typeof useHazards>

const layerMeta: Record<
  LiveLayer,
  { label: string; name: string; provider: string }
> = {
  news: {
    label: 'Reports',
    name: 'Global Voices reports',
    provider: 'Global Voices',
  },
  firms: {
    label: 'Thermal cells',
    name: 'FIRMS thermal cells (NRT detections)',
    provider: 'NASA FIRMS',
  },
  dwd: {
    label: 'Warnings · DE',
    name: 'DWD weather warnings · Warnings · DE (Germany)',
    provider: 'DWD',
  },
  usgs: {
    label: 'Earthquakes',
    name: 'USGS earthquakes',
    provider: 'USGS',
  },
  eonet: {
    label: 'Storms / volcanoes',
    name: 'EONET global hazards · Storms / volcanoes',
    provider: 'NASA EONET',
  },
}

/** Live layer switches with per-layer counts and freshness. */
export function LayerToggles({
  liveLayers,
  onToggle,
  counts,
  quakes,
  hazards,
  warnings,
  fires,
  news,
}: {
  liveLayers: LiveLayer[]
  onToggle: (layer: LiveLayer) => void
  counts: Record<LiveLayer, number>
  quakes: Quakes
  hazards: Hazards
  warnings: Warnings
  fires: Fires
  news: News
}) {
  const state = {
    usgs: quakes,
    eonet: hazards,
    dwd: warnings,
    firms: fires,
    news,
  }
  return (
    <fieldset className="layer-toggles">
      <legend className="sr-only">Live layers</legend>
      {liveLayerKeys.map((key) => {
        const on = liveLayers.includes(key)
        const s = state[key]
        const status = !on
          ? 'Off'
          : s.loading && !s.snapshot
            ? 'Loading'
            : !s.snapshot
              ? 'Unavailable'
              : s.stale
                ? `${counts[key]} · stale`
                : `${counts[key]}`
        return (
          <label
            key={key}
            className={`layer-toggle ${on ? 'on' : ''} ${on && (s.stale || !s.snapshot) && !s.loading ? 'warn' : ''}`}
          >
            <input
              type="checkbox"
              checked={on}
              aria-label={layerMeta[key].name}
              onChange={() => onToggle(key)}
            />
            <span className={`layer-glyph glyph-${key}`} aria-hidden="true">
              {key === 'usgs' ? (
                magnitudeSteps.map((step) => (
                  <i key={step.label} style={{ background: step.color }} />
                ))
              ) : key === 'dwd' || key === 'firms' || key === 'news' ? (
                <i
                  style={{
                    background:
                      key === 'news'
                        ? newsColor
                        : key === 'dwd'
                          ? warningColor
                          : fireColor,
                  }}
                />
              ) : (
                <>
                  <i style={{ background: hazardColors.severeStorms }} />
                  <i style={{ background: hazardColors.volcanoes }} />
                </>
              )}
            </span>
            <span className="layer-name">{layerMeta[key].label}</span>
            <span className="layer-count">{status}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

/** Separate demonstrations, kept out of the live view. */
export function SimulationLab({
  source,
  onChange,
}: {
  source: Source
  onChange: (source: Source) => void
}) {
  const simulations: [Source, string][] = [
    ['demo', 'Other examples · simulated'],
    ...(!firmsAvailable
      ? [['fire-demo', 'Fire examples · simulated'] as [Source, string]]
      : []),
    ['digital-demo', 'Digital world · simulated'],
    ...Object.entries(additionalLayers).map(
      ([key, layer]): [Source, string] => [
        key as AdditionalSource,
        `${layer.label} · simulated`,
      ],
    ),
  ]
  return (
    <details
      className="lab disclosure"
      open={source !== 'usgs' ? true : undefined}
    >
      <summary>Simulation lab · invented examples</summary>
      <div className="disclosure-body">
        <p>
          Demonstrations for layers that are not live yet. They never mix with
          live data.
        </p>
        <div className="lab-sources">
          {simulations.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={source === key}
              onClick={() => onChange(key)}
            >
              {label}
            </button>
          ))}
          {localSourceAccess && (
            <button onClick={() => onChange('nws')}>
              NWS weather · local development
            </button>
          )}
        </div>
      </div>
    </details>
  )
}

/** Status, freshness and provenance for each active live layer. */
export function LiveStatus({
  liveLayers,
  quakes,
  hazards,
  warnings,
  fires,
  news,
}: {
  liveLayers: LiveLayer[]
  quakes: Quakes
  hazards: Hazards
  warnings: Warnings
  fires: Fires
  news: News
}) {
  const { snapshot, health, loading, error, stale, waitSeconds, offline } =
    quakes
  return (
    <section className="live-status" aria-label="Data source">
      <h2 className="section-title">Sources and freshness</h2>
      <p className="section-lede">
        Coming next: floods, {!firmsAvailable && 'fire detections, '}broader
        weather coverage, more news sources, digital, space and movement.
      </p>
      <div className="status-grid">
        {liveLayers.includes('news') && (
          <div className="source-status" aria-label="Global Voices status">
            <strong
              className={
                !news.snapshot || news.stale ? 'status-warn' : 'status-ok'
              }
              aria-live="polite"
            >
              {news.loading
                ? 'Loading report headlines…'
                : !news.snapshot
                  ? 'Global Voices unavailable'
                  : news.stale
                    ? 'STALE · last available reports'
                    : 'Live Global Voices reports'}
            </strong>
            {news.snapshot && (
              <p>
                Retrieved {formatTimestamp(news.snapshot.retrieved_at)} ·{' '}
                {news.snapshot.events.length} headlines. Choose 3 or 7 days for
                reports delayed 24 hours.
              </p>
            )}
            {news.error && <p className="source-error">{news.error}</p>}
            {news.snapshot?.events.length === 0 && (
              <p>
                Valid feed with no eligible headlines. This does not mean no
                news.
              </p>
            )}
            <details className="disclosure">
              <summary>Reports freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  Global Voices English-edition headlines and bylines, as
                  supplied. Attributed claims, not verified incidents. Feed
                  only; no inferred locations, translations, summaries or
                  corroboration. Publication and retrieval remain distinct;
                  occurrence and article update are unknown. At least 24 hours
                  delayed; bounded to the latest feed and past 7 days.
                </p>
                <p>
                  Credit Global Voices and each bylined author.{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/3.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 3.0
                  </a>
                  . Metadata selected and reformatted by GOSIP. No endorsement;
                  linked articles and third-party media have their own terms.
                </p>
                <p>
                  Provider checks every 15 minutes; published snapshots checked
                  every 15 minutes. Stale after 45 minutes without a successful
                  pipeline check or on failure. Retrieval does not establish
                  editorial freshness. No feed generation time used.
                </p>
                {news.health && (
                  <p>
                    Last pipeline attempt{' '}
                    {formatTimestamp(news.health.attempted_at)} · Status:{' '}
                    {news.health.status}.
                  </p>
                )}
                <a
                  href="https://globalvoices.org/about/global-voices-attribution-policy/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Global Voices attribution policy ↗
                </a>
                <button
                  onClick={() => void news.refresh()}
                  disabled={
                    news.loading || news.offline || news.waitSeconds > 0
                  }
                >
                  Refresh reports
                </button>
              </div>
            </details>
          </div>
        )}

        {liveLayers.includes('usgs') && (
          <div className="source-status">
            <div aria-live="polite">
              <strong
                className={!snapshot || stale ? 'status-warn' : 'status-ok'}
              >
                {loading
                  ? 'Loading earthquake snapshot…'
                  : !snapshot
                    ? 'USGS unavailable · no observations loaded'
                    : stale
                      ? 'STALE · last available observations'
                      : 'Live USGS earthquakes'}
              </strong>
              {snapshot && (
                <p>
                  Retrieved {formatTimestamp(snapshot.retrieved_at)} ·{' '}
                  {snapshot.events.length} earthquakes in the week snapshot.
                </p>
              )}
              {error && <p className="source-error">{error}</p>}
            </div>
            <details className="disclosure">
              <summary>Freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  M2.5+ earthquakes · USGS / ANSS · Estimates may change.
                  Coverage varies; no impact assessment.
                </p>
                <p>
                  Ingestion scheduled every 15 minutes; delays are possible.
                  Stale after 45 minutes or a failed ingestion. This page checks
                  published data every 15 minutes while visible.
                </p>
                {health && (
                  <p>
                    Last pipeline attempt {formatTimestamp(health.attempted_at)}{' '}
                    · Status: {health.status}.
                  </p>
                )}
                {snapshot && (
                  <p>
                    Feed generated {formatTimestamp(snapshot.generated_at)} ·
                    Retrieved {formatTimestamp(snapshot.retrieved_at)} ·{' '}
                    {snapshot.rejected} invalid records rejected;{' '}
                    {snapshot.excluded} non-earthquake records excluded.
                  </p>
                )}
                <a
                  href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                  target="_blank"
                  rel="noreferrer"
                >
                  U.S. Geological Survey / ANSS source ↗
                </a>
                <div className="source-actions">
                  <button
                    onClick={() => void quakes.refresh()}
                    disabled={loading || offline || waitSeconds > 0}
                  >
                    Refresh published data
                  </button>
                  {offline && <span>Offline · refresh paused</span>}
                </div>
              </div>
            </details>
          </div>
        )}
        {liveLayers.includes('eonet') && (
          <div className="source-status" aria-label="EONET status">
            <strong
              aria-live="polite"
              className={
                !hazards.snapshot || hazards.stale ? 'status-warn' : 'status-ok'
              }
            >
              {hazards.loading
                ? 'Loading hazard snapshot…'
                : !hazards.snapshot
                  ? 'EONET unavailable · no catalog loaded'
                  : hazards.stale
                    ? 'STALE · last available EONET catalog'
                    : 'Live EONET global hazards'}
            </strong>
            {hazards.snapshot && (
              <p>
                Retrieved {formatTimestamp(hazards.snapshot.retrieved_at)} ·{' '}
                {hazards.snapshot.events.length} catalog entries in the 30-day
                request.
              </p>
            )}
            {hazards.error && <p className="source-error">{hazards.error}</p>}
            {hazards.snapshot?.events.length === 0 && (
              <p>
                Valid empty catalog response. This does not mean there are no
                hazards.
              </p>
            )}
            <details className="disclosure">
              <summary>EONET freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  NASA EONET · Curated storms and volcanoes. Approximate
                  metadata, not official warnings.
                </p>
                <p>
                  Shared ingestion and page checks every 15 minutes; delays
                  possible. Stale after 45 minutes from retrieval or a failed
                  check. Feed generation and publication times are not supplied;
                  recent retrieval does not prove recent curation.
                </p>
                {hazards.health && (
                  <p>
                    Last pipeline attempt{' '}
                    {formatTimestamp(hazards.health.attempted_at)} · Status:{' '}
                    {hazards.health.status}.
                  </p>
                )}
                <p>
                  Open and closed catalog entries; latest geometry date drives
                  the window. Dates and locations are approximate, not incident
                  onset or affected area. Polygon records are feed-only. No
                  grouping or corroboration across sources; the same hazard may
                  appear in more than one source.
                </p>
                <a
                  href="https://eonet.gsfc.nasa.gov/what-is-eonet"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA EONET scope & disclaimer ↗
                </a>
                <div className="source-actions">
                  <button
                    onClick={() => void hazards.refresh()}
                    disabled={
                      hazards.loading ||
                      hazards.offline ||
                      hazards.waitSeconds > 0
                    }
                  >
                    Refresh EONET data
                  </button>
                  {hazards.offline && <span>Offline · refresh paused</span>}
                </div>
              </div>
            </details>
          </div>
        )}
        {liveLayers.includes('dwd') && (
          <div className="source-status" aria-label="DWD status">
            <strong
              aria-live="polite"
              className={
                !warnings.snapshot || warnings.stale
                  ? 'status-warn'
                  : 'status-ok'
              }
            >
              {warnings.loading
                ? 'Loading warnings…'
                : !warnings.snapshot
                  ? 'DWD unavailable · no warnings loaded'
                  : warnings.stale
                    ? 'STALE · last available DWD warnings'
                    : 'Live DWD weather warnings'}
            </strong>
            {warnings.snapshot && (
              <p>
                Retrieved {formatTimestamp(warnings.snapshot.retrieved_at)} ·{' '}
                {warnings.snapshot.events.length} district warnings.
              </p>
            )}
            {warnings.error && <p className="source-error">{warnings.error}</p>}
            {warnings.snapshot?.events.length === 0 && (
              <p>
                Valid empty warning response. This does not mean there are no
                hazards.
              </p>
            )}
            <details className="disclosure">
              <summary>DWD freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  Germany · active and upcoming district warnings, original
                  German. Feed only: no coordinates supplied. The selected
                  window looks forward for warnings. Preliminary information is
                  excluded.
                </p>
                <p>
                  Copyright Deutscher Wetterdienst ·{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 4.0
                  </a>
                  . Reformatted and filtered by GOSIP. No endorsement.{' '}
                  <a
                    href="https://www.dwd.de/warnungen"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Current DWD warnings ↗
                  </a>
                </p>
                <p>
                  Ingestion and page checks every 15 minutes; stale after 45
                  minutes from generation/retrieval or failure. This is not an
                  emergency service. Warning validity is distinct from
                  occurrence; individual issue/update times are not supplied.
                </p>
                {warnings.snapshot && (
                  <p>
                    Feed generated{' '}
                    {formatTimestamp(warnings.snapshot.generated_at)}.
                  </p>
                )}
                {warnings.health && (
                  <p>
                    Last pipeline attempt{' '}
                    {formatTimestamp(warnings.health.attempted_at)} · Status:{' '}
                    {warnings.health.status}.
                  </p>
                )}
                <button
                  onClick={() => void warnings.refresh()}
                  disabled={
                    warnings.loading ||
                    warnings.offline ||
                    warnings.waitSeconds > 0
                  }
                >
                  Refresh DWD data
                </button>
              </div>
            </details>
          </div>
        )}
        {liveLayers.includes('firms') && (
          <div className="source-status" aria-label="FIRMS status">
            <strong
              aria-live="polite"
              className={
                !fires.snapshot || fires.stale ? 'status-warn' : 'status-ok'
              }
            >
              {fires.loading
                ? 'Loading thermal summaries…'
                : !fires.snapshot
                  ? 'FIRMS unavailable · no detections loaded'
                  : fires.stale
                    ? 'STALE · last available FIRMS summary'
                    : 'Live FIRMS · global thermal summary'}
            </strong>
            {fires.snapshot && (
              <p>
                Global · {fires.snapshot.feed.interval_end.slice(0, 10)} UTC ·{' '}
                {fires.snapshot.events.length} occupied 2° cells · retrieved{' '}
                {formatTimestamp(fires.snapshot.retrieved_at)}. Preceding 24
                hours.
              </p>
            )}
            {fires.error && <p className="source-error">{fires.error}</p>}
            {fires.snapshot?.events.length === 0 && (
              <p>
                Valid empty detection response. Missing detections do not
                establish absence of fire.
              </p>
            )}
            <details className="disclosure">
              <summary>FIRMS freshness & source details</summary>
              <div className="disclosure-body">
                <p>
                  NASA FIRMS / LANCE · NOAA-20 VIIRS · Global. GOSIP aggregates
                  the most recent 24 hours into 2° cells, without added delay.
                  Counts are detections, not confirmed fires or impacts. No
                  individual positions, times or inferred causes.
                </p>
                <p>
                  We acknowledge NASA LANCE, part of ESDIS.{' '}
                  <a
                    href="https://www.earthdata.nasa.gov/data/projects/lance"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NASA acknowledgment & disclaimer ↗
                  </a>
                  . Data provided as is; no emergency use or endorsement.
                </p>
                <p>
                  Scheduled checks every 15 minutes; retrieval stale after 45
                  minutes or failure. The intentional observation delay is
                  separate from retrieval freshness. Feed generation,
                  publication and update times are unknown; coverage is
                  incomplete.
                </p>
                {fires.health && (
                  <p>
                    Last pipeline attempt{' '}
                    {formatTimestamp(fires.health.attempted_at)} · Status:{' '}
                    {fires.health.status}.
                  </p>
                )}
                <button
                  onClick={() => void fires.refresh()}
                  disabled={
                    fires.loading || fires.offline || fires.waitSeconds > 0
                  }
                >
                  Refresh FIRMS data
                </button>
              </div>
            </details>
          </div>
        )}
        {!liveLayers.length && (
          <p className="section-lede">
            Turn on a live layer to see its source status.
          </p>
        )}
      </div>
    </section>
  )
}
