import { LIVE_STALE_MS } from '../data/published'
import {
  archiveSources,
  capturedStale,
  type Archive,
  type Capture,
} from '../data/archive'
import { formatTimestamp } from '../data/events'

export function ArchiveControls({
  captures,
  selected,
  value,
  onChange,
}: {
  captures: Capture[]
  selected?: Capture
  value: string
  onChange: (value: string) => void
}) {
  const index = captures.findIndex(
    (c) => c.captured_at === selected?.captured_at,
  )
  return (
    <div className="archive-controls">
      <label htmlFor="history-capture">Published capture · UTC</label>
      <select
        id="history-capture"
        value={selected?.captured_at ?? value}
        onChange={(e) => onChange(e.target.value)}
      >
        {!selected && <option value={value}>Capture unavailable</option>}
        {captures.map((c) => (
          <option key={c.captured_at} value={c.captured_at}>
            {formatTimestamp(c.captured_at)}
          </option>
        ))}
      </select>
      <div className="rail-group segmented">
        <button
          disabled={index <= 0}
          onClick={() => onChange(captures[index - 1].captured_at)}
        >
          Earlier capture
        </button>
        <button
          disabled={index < 0 || index >= captures.length - 1}
          onClick={() => onChange(captures[index + 1].captured_at)}
        >
          Later capture
        </button>
      </div>
    </div>
  )
}
export function ArchiveStatus({
  archive,
  captures,
  selected,
  error,
  loading,
  refresh,
}: {
  archive: Archive | null
  captures: Capture[]
  selected?: Capture
  error: string
  loading: boolean
  refresh: () => void
}) {
  return (
    <section className="archive-status" aria-label="History provenance">
      <strong>Recorded snapshots · 7-day retention</strong>
      <p>
        {loading
          ? 'Loading history…'
          : `${captures.length} of up to 7 daily captures available. Missing days are not filled.`}
      </p>
      {error && (
        <p className="history-warning" role="alert">
          {error}
        </p>
      )}
      {archive && (
        <p>
          Archive checked {formatTimestamp(archive.attempted_at)}.{' '}
          {archive.status === 'degraded'
            ? archive.error === 'continuity-unavailable'
              ? 'Earlier history unavailable; collection starts with these captures.'
              : 'Capture failed; retained records keep original times.'
            : ''}
        </p>
      )}
      {archive &&
        Date.now() - Date.parse(archive.attempted_at) > LIVE_STALE_MS && (
          <p className="history-warning">
            Archive updates are stale. Capture times have not changed.
          </p>
        )}
      {!selected && !loading && (
        <p>
          Selected capture missing or expired. Choose an available capture or
          return to Current.
        </p>
      )}
      {selected && (
        <>
          <p className="history-capture-note">
            Captured from the public site{' '}
            {formatTimestamp(selected.captured_at)}. Window ends at this
            capture.
          </p>
          <details className="disclosure">
            <summary>Capture provenance & source health</summary>
            <p>
              Release built {formatTimestamp(selected.release.built_at)} ·{' '}
              <a
                href={`https://github.com/sebastienlato/G.O.S.I.P/actions/runs/${selected.release.run_id}`}
                target="_blank"
                rel="noreferrer"
              >
                publication run ↗
              </a>{' '}
              · source {selected.release.source_commit.slice(0, 7)}.
            </p>
            {archiveSources.map((source) => {
              const h = selected.sources[source]?.health
              return (
                <p key={source}>
                  <strong>
                    {source === 'usgs' ? 'USGS / ANSS' : 'NASA EONET'}
                  </strong>{' '}
                  ·{' '}
                  {!h || !h.fetched_at ? (
                    'Unavailable in this capture'
                  ) : (
                    <>
                      {h.record_count} records ·{' '}
                      {capturedStale(selected, source)
                        ? 'stale / failed at capture'
                        : 'fresh at capture'}
                      <br />
                      Retrieved {formatTimestamp(h.fetched_at)}
                      <br />
                      Generated{' '}
                      {h.generated_at
                        ? formatTimestamp(h.generated_at)
                        : 'unknown'}
                      . Pipeline attempted {formatTimestamp(h.attempted_at)}.
                    </>
                  )}
                </p>
              )
            })}
            <p>
              USGS occurrence and revision times, EONET geometry dates and
              original retrieval stay distinct from capture. Text is the
              captured version; linked provider pages may have changed. This is
              not a complete revision archive or proof of what was known at an
              event’s time. Globe imagery follows the current display settings;
              it is not archived imagery.
            </p>
            <p>
              Continuity tracked since{' '}
              {archive ? formatTimestamp(archive.continuity_since) : 'unknown'}.
              Daily captures can repeat retained data. No capture before
              collection began; outages can interrupt retention.
            </p>
          </details>
        </>
      )}
      <p>
        History covers earthquakes and EONET hazards only. Other layers have no
        archive here. Source attribution and caveats remain in record details.
      </p>
      <button onClick={refresh} disabled={loading}>
        Reload history
      </button>
      <small> At most once per minute.</small>
    </section>
  )
}
