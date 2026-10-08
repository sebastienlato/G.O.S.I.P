import {
  REPORT_COVERAGE,
  reportLanguages,
  type ReportLanguage,
} from '../data/reports'

export default function ReportSource({
  language,
  reportStatus,
  onLanguage,
  onStatus,
}: {
  language: ReportLanguage | 'all'
  reportStatus: 'all' | 'corrected'
  onLanguage: (language: ReportLanguage | 'all') => void
  onStatus: (status: 'all' | 'corrected') => void
}) {
  return (
    <section
      className="feed-source report-source"
      aria-label="Report coverage and filters"
    >
      <div className="source-status">
        <strong>SIMULATED · Global reports</strong>
        <p>{REPORT_COVERAGE}</p>
        <p>
          No live news feed is connected. ReliefWeb requires an approved
          application name and source-specific rights checks; Wikinews is
          read-only. No account, request, cache or translation service is used.
        </p>
        <p>
          Windows use scenario publication time before the selected fixture
          clock (snapshot or playback cursor). Original text stays in its source
          language; translations appear only when supplied in the fixture. Each
          original link opens a local plain-text fixture, not a real publisher.
        </p>
        <div className="report-filters">
          <label>
            Source language
            <select
              aria-label="Source language"
              value={language}
              onChange={(e) =>
                onLanguage(e.target.value as ReportLanguage | 'all')
              }
            >
              <option value="all">All languages</option>
              {Object.entries(reportLanguages).map(([code, label]) => (
                <option value={code} key={code}>
                  {label} · {code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Report updates
            <select
              aria-label="Report updates"
              value={reportStatus}
              onChange={(e) => onStatus(e.target.value as 'all' | 'corrected')}
            >
              <option value="all">All reports</option>
              <option value="corrected">With a supplied correction</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
