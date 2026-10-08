import { useEffect, useState } from 'react'
import {
  DEMO_TIME,
  formatTimestamp,
  type ExplorerEvent,
  type WindowHours,
} from '../data/events'
import {
  HOUR,
  HISTORY_START,
  supportsPlayback,
  placeOptions,
} from '../data/history'
import type { ExplorerFilters, Source } from '../state/explorer'

export default function HistoryControls({
  source,
  cursor,
  country,
  region,
  hours,
  events,
  suspended,
  update,
}: {
  source: Source
  cursor: number | null
  country: string
  region: string
  hours: WindowHours
  events: readonly ExplorerEvent[]
  suspended: boolean
  update: (patch: Partial<ExplorerFilters>, replace?: boolean) => void
}) {
  const [playing, setPlaying] = useState(false)
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const supported = supportsPlayback(source)
  const time = cursor ?? DEMO_TIME
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => {
      setReduced(media.matches)
      setPlaying(false)
    }
    const pause = () => setPlaying(false)
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', pause)
    window.addEventListener('pagehide', pause)
    window.addEventListener('popstate', pause)
    return () => {
      media.removeEventListener('change', motion)
      document.removeEventListener('visibilitychange', pause)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('popstate', pause)
    }
  }, [])
  useEffect(() => {
    setPlaying(false)
  }, [source, country, region, hours, suspended])
  useEffect(() => {
    if (!playing || suspended || reduced || !supported || document.hidden)
      return
    if (time >= DEMO_TIME) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      if (document.hidden || document.querySelector('dialog[open]'))
        setPlaying(false)
      else update({ cursor: Math.min(DEMO_TIME, time + 6 * HOUR) }, true)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [playing, suspended, reduced, supported, time, update])
  const move = (next: number | null, replace = false) => {
    setPlaying(false)
    update(
      {
        cursor:
          next === null
            ? null
            : Math.max(HISTORY_START, Math.min(DEMO_TIME, next)),
      },
      replace,
    )
  }
  const countries = placeOptions(events, 'country')
  const regions = placeOptions(events, 'region')
  return (
    <section
      className="history-panel"
      aria-label="History and regional exploration"
    >
      <div className="history-heading">
        <div>
          <span className="eyebrow">EXPLORE IN CONTEXT</span>
          <h2>Time & place</h2>
        </div>
        <span className="history-mode">
          {supported
            ? cursor === null
              ? 'FIXED FIXTURE SNAPSHOT'
              : 'SIMULATED PLAYBACK'
            : 'CURRENT SOURCE'}
        </span>
      </div>
      {supported ? (
        <>
          <p className="history-clock">
            <strong>{formatTimestamp(time)}</strong> ·{' '}
            {cursor === null ? 'Snapshot clock' : 'Playback cursor'}
          </p>
          <p className="history-range">
            Window: {formatTimestamp(time - hours * HOUR)} →{' '}
            {formatTimestamp(time)}
          </p>
          <label className="scrub-label" htmlFor="history-cursor">
            Scrub simulated time · hourly steps
          </label>
          <input
            id="history-cursor"
            type="range"
            min="0"
            max="168"
            step="1"
            value={(time - HISTORY_START) / HOUR}
            aria-valuetext={formatTimestamp(time)}
            onChange={(e) =>
              move(HISTORY_START + Number(e.target.value) * HOUR, true)
            }
          />
          <div className="history-endpoints">
            <span>01 Oct · 16:00 UTC</span>
            <span>08 Oct · 16:00 UTC</span>
          </div>
          <div className="history-actions">
            <button
              disabled={time <= HISTORY_START}
              onClick={() => move(time - 6 * HOUR)}
            >
              ← Back 6h
            </button>
            <button
              disabled={reduced}
              onClick={() => {
                if (playing) setPlaying(false)
                else {
                  update({ cursor: time >= DEMO_TIME ? HISTORY_START : time })
                  setPlaying(true)
                }
              }}
            >
              {playing ? 'Pause playback' : 'Play simulation'}
            </button>
            <button
              disabled={time >= DEMO_TIME}
              onClick={() => move(time + 6 * HOUR)}
            >
              Forward 6h →
            </button>
            <button disabled={cursor === null} onClick={() => move(null)}>
              Return to snapshot
            </button>
          </div>
          <p className="history-note">
            Playback advances 6 hours every 1.2 seconds and stops at the
            snapshot.
          </p>
          {reduced && (
            <p>
              Reduced motion: use the slider or step buttons; automatic playback
              is off.
            </p>
          )}
          <p className="history-note">
            {events.length} original fixtures in this source.{' '}
            {source === 'reports-demo'
              ? 'Publication drives the window; corrections do not change publication.'
              : source === 'digital-demo'
                ? 'Measurement intervals overlap the window; full interval totals may extend beyond the cursor.'
                : 'Scenario occurrence drives the window.'}{' '}
            Latest fixture text, corrections and full measurements remain
            visible. This is timestamp exploration, not a reconstruction of what
            was known then. No complete archive or real-world coverage.
          </p>
        </>
      ) : (
        <p className="history-note">
          Playback unavailable.{' '}
          {source === 'usgs'
            ? 'The USGS week snapshot and 24-hour local cache contain no complete revision history or proof of what was known earlier.'
            : 'NWS supplies current forecast validity periods, not archived predictions or past observations.'}{' '}
          Current source controls and times remain active; no simulation is
          substituted.
        </p>
      )}
      <div className="place-controls">
        <label>
          Country context
          <select
            aria-label="Country context"
            value={country}
            onChange={(e) => update({ country: e.target.value, region: '' })}
          >
            <option value="">All country contexts</option>
            {countries.map((name) => (
              <option key={name}>{name}</option>
            ))}
            <option value="~unknown">Country not supplied / withheld</option>
            {country &&
              country !== '~unknown' &&
              !countries.includes(country) && (
                <option value={country}>{country} (not in this source)</option>
              )}
          </select>
        </label>
        <label>
          Region context
          <select
            aria-label="Region context"
            value={region}
            onChange={(e) => update({ region: e.target.value })}
          >
            <option value="">All region contexts</option>
            {regions.map((name) => (
              <option key={name}>{name}</option>
            ))}
            {region && !regions.includes(region) && (
              <option value={region}>{region} (not in this source)</option>
            )}
          </select>
        </label>
        <button
          disabled={!country && !region}
          onClick={() => update({ country: '', region: '' })}
        >
          Clear place filters
        </button>
      </div>
      <p className="history-note">
        Exact supplied labels only; no country inferred from coordinates or
        place text. Unknown and withheld locations remain available. Context is
        not nationality, an incident position or nationwide impact. No results
        can mean missing coverage.
      </p>
    </section>
  )
}
