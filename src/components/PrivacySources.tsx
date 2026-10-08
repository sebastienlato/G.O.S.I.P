import { localSourceAccess } from '../state/sourceAccess'

export default function PrivacySources() {
  return (
    <div className="privacy-sources">
      <h3>Privacy & storage</h3>
      <p>
        No GOSIP account, analytics, ads, cookies, location permission or
        tracking. App files and maps come from this host; a hosting provider can
        receive your IP address and requested URLs. Search and place filters
        appear in the address bar, browser history and copied links. Avoid
        personal or sensitive search text. GOSIP sends no referrer on outgoing
        requests or links.
      </p>
      <p>
        {localSourceAccess
          ? 'On this loopback host, selecting USGS or NWS can contact that provider directly, revealing your IP address and browser connection information. No credentials are sent.'
          : 'On this host, USGS and NWS requests are disabled. Simulations and bundled geography work without contacting a data provider.'}{' '}
        Opening an external source link leaves GOSIP and contacts that site.
      </p>
      <p>
        USGS alone can save a validated snapshot in this browser for up to 24
        hours from its older source/retrieval time. Cleanup runs when the cache
        is next accessed or while USGS is active, not while the app is closed.
        Clear saved USGS cache removes the saved snapshot, keeping loaded data
        and the separate request cooldown/failure record. Browser site-data
        controls remove both. NWS stays in page memory; simulations need no
        storage. No offline cold-start guarantee.
      </p>
      <h3>Sources & licenses</h3>
      <ul>
        <li>
          <strong>U.S. Geological Survey / ANSS:</strong> M2.5+ week source
          parameters only, with credit and event links. USGS-produced data is in
          the U.S. public domain; third-party exceptions are separate.{' '}
          <a
            href="https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits"
            target="_blank"
            rel="noreferrer"
          >
            USGS terms ↗
          </a>
        </li>
        <li>
          <strong>NOAA / National Weather Service:</strong> one Lower Manhattan
          forecast. NWS text and values retain source credit, with GOSIP display
          labels. NWS material is public domain unless otherwise noted and is
          not covered by GOSIP copyright. No endorsement or affiliation.{' '}
          <a
            href="https://www.weather.gov/disclaimer"
            target="_blank"
            rel="noreferrer"
          >
            NWS terms ↗
          </a>
        </li>
        <li>
          <strong>Simulations:</strong> original GOSIP fixtures. No live fire,
          report, digital, space, aviation or maritime data is connected.
          Examples are never evidence of actual conditions.
        </li>
        <li>
          <strong>Map:</strong> Natural Earth 4.1.0 public-domain geography via
          world-atlas 2.0.2. Boundaries are illustrative and may be outdated.{' '}
          <a href="/MAP_DATA_LICENSE.txt" target="_blank" rel="noreferrer">
            Natural Earth notice ↗
          </a>
          {' · '}
          <a href="/WORLD_ATLAS_LICENSE.txt" target="_blank" rel="noreferrer">
            world-atlas notice ↗
          </a>
        </li>
        <li>
          <strong>Software:</strong> original GOSIP code remains UNLICENSED,
          pending the owner's copyright/license decision. Free access does not
          grant an open-source license. Dependencies retain their own licenses.{' '}
          <a href="/dependency-notices.txt" target="_blank" rel="noreferrer">
            Bundled dependency notices ↗
          </a>
        </li>
      </ul>
      <h3>Free access, bounded service</h3>
      <p>
        No paid fallback or automatic upgrade. Real sources are restricted to
        local loopback use until public access limits are resolved; browser
        throttling cannot cap total visitor traffic. NWS also documents
        application identification requirements that need resolution for a
        public browser client. This prototype is not an emergency service or a
        complete global record. No provider endorsement is implied.
      </p>
    </div>
  )
}
