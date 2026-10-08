import { formatTimestamp, locationMeaning } from '../data/events'
import { reportLanguages, type ReportEvent } from '../data/reports'

export default function ReportBody({ event }: { event: ReportEvent }) {
  const t = event.translation
  const correction = event.correction
  return (
    <>
      <p className="report-label">
        Original-language text · {reportLanguages[event.source_language]} (
        {event.source_language})
      </p>
      <p className="detail-summary" lang={event.source_language} dir="auto">
        {event.summary}
      </p>
      <h3>Publisher & original source</h3>
      <p className="source-name" dir="auto">
        {event.source_name}
      </p>
      <p className="muted text-sm">
        All publisher names are fictional. Report ID: {event.id}
      </p>
      <p className="report-link">
        {event.source_url ? (
          <a href={event.source_url} target="_blank" rel="noreferrer">
            Open original fixture (plain text) ↗
          </a>
        ) : (
          'Original link not supplied'
        )}
      </p>
      {t ? (
        <section
          className="report-translation"
          aria-label="Supplied translation"
        >
          <h3>Supplied English translation</h3>
          <p className="muted text-sm">
            {t.supplied_by}. Original text remains above; no automatic
            translation.
          </p>
          <strong lang="en">{t.title}</strong>
          <p lang="en">{t.summary}</p>
        </section>
      ) : (
        <p className="muted text-sm">
          No translation supplied. Original-language text is shown unchanged.
        </p>
      )}
      <dl className="timestamps">
        <div>
          <dt>Scenario publication</dt>
          <dd>{formatTimestamp(event.published_at)}</dd>
        </div>
        <div>
          <dt>Scenario publisher update</dt>
          <dd>
            {event.updated_at
              ? formatTimestamp(event.updated_at)
              : 'Not supplied'}
          </dd>
        </div>
        <div>
          <dt>Claimed occurrence · scenario</dt>
          <dd>
            {event.occurred_at
              ? formatTimestamp(event.occurred_at)
              : 'Not supplied · not inferred from publication'}
          </dd>
        </div>
        <div>
          <dt>Scenario retrieval / fixture snapshot</dt>
          <dd>{formatTimestamp(event.collected_at)}</dd>
        </div>
        <div>
          <dt>Source language</dt>
          <dd>
            {reportLanguages[event.source_language]} ({event.source_language})
          </dd>
        </div>
        <div>
          <dt>Location treatment</dt>
          <dd>{locationMeaning(event)}</dd>
        </div>
      </dl>
      {correction ? (
        <section className="report-correction" aria-label="Supplied correction">
          <h3>Supplied correction · one prior version</h3>
          <p>{correction.note}</p>
          <details>
            <summary>Compare the supplied prior version</summary>
            <p className="muted text-sm">
              Prior version: {formatTimestamp(correction.previous_updated_at)}
            </p>
            <strong lang={event.source_language} dir="auto">
              {correction.previous_title}
            </strong>
            <p lang={event.source_language} dir="auto">
              {correction.previous_summary}
            </p>
            <p className="muted text-sm">
              Current version is shown above. The prior claim is superseded, not
              a second independent report.
            </p>
          </details>
        </section>
      ) : (
        <p className="muted text-sm">
          No correction supplied in this fixture. This does not establish that a
          report has never changed.
        </p>
      )}
      <h3>Uncertainty & coverage</h3>
      <p className="muted text-sm leading-6">
        {event.uncertainty} {event.coverage_note} Repeated claims do not
        establish independent corroboration. No live updates or comprehensive
        revision history.
      </p>
    </>
  )
}
