import {
  DIGITAL_COVERAGE,
  digitalFamilies,
  digitalResults,
  type DigitalFamily,
  type DigitalResult,
} from '../data/digital'

export default function DigitalSource({
  family,
  result,
  onFamily,
  onResult,
}: {
  family: DigitalFamily | 'all'
  result: DigitalResult | 'all'
  onFamily: (value: DigitalFamily | 'all') => void
  onResult: (value: DigitalResult | 'all') => void
}) {
  return (
    <section
      className="feed-source report-source digital-source"
      aria-label="Digital coverage and filters"
    >
      <div className="source-status">
        <strong>SIMULATED · Digital world</strong>
        <p>{DIGITAL_COVERAGE}</p>
        <p>
          Explore reachability and web-test scenarios. Windows include
          measurement intervals overlapping the time before the selected fixture
          clock (snapshot or playback cursor), ordered by interval end. Every
          number is invented; no provider data is loaded.
        </p>
        <details>
          <summary>Coverage, privacy & source research</summary>
          <p>
            Active probes cover only selected responding networks. Volunteer web
            tests depend on where people test, their networks and selected
            targets. Repeat tests are not independent people. Missing samples
            may reflect collection problems. Country markers indicate broad
            context, not outage extent or probe positions.
          </p>
          <p>
            Probe IPs, contributor identifiers and tested URLs are omitted.
            Network examples use fictional private-use ASNs. No sensitive
            locations, causes, actors or affected-user totals are inferred.
          </p>
          <p>
            Method references:{' '}
            <a
              href="https://ioda.inetintel.cc.gatech.edu/"
              target="_blank"
              rel="noreferrer"
            >
              IODA / Georgia Tech
            </a>{' '}
            and{' '}
            <a
              href="https://ooni.org/support/interpreting-ooni-data/"
              target="_blank"
              rel="noreferrer"
            >
              OONI interpretation guide
            </a>
            . These organizations did not supply these fixtures. OONI data
            carries noncommercial/share-alike terms and its API has
            infrastructure load concerns; IODA reuse/access limits remain
            unresolved. No live integration, account or digital-source requests
            are enabled.
          </p>
        </details>
        <div className="report-filters">
          <label>
            Measurement family
            <select
              aria-label="Measurement family"
              value={family}
              onChange={(e) =>
                onFamily(e.target.value as DigitalFamily | 'all')
              }
            >
              <option value="all">All digital measurements</option>
              {Object.entries(digitalFamilies).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sample result
            <select
              aria-label="Sample result"
              value={result}
              onChange={(e) =>
                onResult(e.target.value as DigitalResult | 'all')
              }
            >
              <option value="all">All results</option>
              {Object.entries(digitalResults).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
