import { firmsAvailable } from '../state/explorer'
import { assetPath } from '../state/assetPath'
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
          ? 'On this loopback host, selecting the development NWS source can contact that provider directly, revealing your IP address and browser connection information. No credentials are sent.'
          : 'Live layers are read from snapshots on this host. Your browser does not contact data providers. Public NWS is not connected yet.'}{' '}
        Opening an external source link leaves GOSIP and contacts that site.
      </p>
      <p>
        <strong>Globe imagery:</strong> the interactive globe loads satellite,
        label, terrain and 3D-city tiles directly from Esri, NASA GIBS and
        Cesium ion (which may serve Bing or Google content). Those services
        receive your IP address and the map areas you view, like any online map.
        The list view and static map make none of these requests. Display
        preferences (imagery, filter, labels, 3D) are kept only in this browser.
      </p>
      <p>
        Live snapshots remain in page memory. Your browser may cache hosted
        files normally. Old local USGS storage from earlier versions is no
        longer read; browser site-data controls can remove it. NWS stays in page
        memory.
      </p>
      <h3>Sources & licenses</h3>
      <ul>
        {firmsAvailable && (
          <li>
            <strong>NASA FIRMS / LANCE:</strong> Global NOAA-20 VIIRS detections
            aggregated by GOSIP into 2° cells over the latest 24 hours, without
            added delay. No precise source positions or inferred causes. We
            acknowledge NASA LANCE, part of ESDIS; data provided as is.{' '}
            <a
              href="https://www.earthdata.nasa.gov/data/projects/lance"
              target="_blank"
              rel="noreferrer"
            >
              NASA acknowledgment & disclaimer ↗
            </a>
          </li>
        )}
        <li>
          <strong>Deutscher Wetterdienst (DWD):</strong> Copyright Deutscher
          Wetterdienst ·{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          . District warnings for Germany, original German, reformatted and
          filtered by GOSIP; no endorsement.{' '}
          <a
            href="https://www.dwd.de/copyright"
            target="_blank"
            rel="noreferrer"
          >
            DWD terms ↗
          </a>
        </li>
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
          <strong>NASA EONET:</strong> curated public natural-event metadata,
          credited with catalog IDs and original source references. Only titles,
          categories, dates, geometry and magnitude parameters; no imagery or
          linked reports copied. General-information display under EONET's
          documented purpose; approximate spatial/temporal extents, no
          endorsement.{' '}
          <a
            href="https://eonet.gsfc.nasa.gov/what-is-eonet"
            target="_blank"
            rel="noreferrer"
          >
            EONET scope & disclaimer ↗
          </a>
        </li>
        <li>
          <strong>Coming: NOAA / National Weather Service.</strong> Local
          development only: one Lower Manhattan forecast. NWS text and values
          retain source credit, with GOSIP display labels. NWS material is
          public domain unless otherwise noted and is not covered by GOSIP
          copyright. No endorsement or affiliation.{' '}
          <a
            href="https://www.weather.gov/disclaimer"
            target="_blank"
            rel="noreferrer"
          >
            NWS terms ↗
          </a>
        </li>
        <li>
          <strong>Global Voices:</strong> English-edition headline metadata and
          bylines under{' '}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 3.0
          </a>
          . Credit each author and link to the original; selected and
          reformatted by GOSIP, no endorsement. Attributed claims, delayed 24
          hours, feed only. No full articles, photos, translations or summaries
          copied.{' '}
          <a
            href="https://globalvoices.org/about/global-voices-attribution-policy/"
            target="_blank"
            rel="noreferrer"
          >
            Republishing policy ↗
          </a>
        </li>
        <li>
          <strong>Coming:</strong> {!firmsAvailable && 'fire, '}broader weather,
          more news sources, digital, space, aviation and maritime.{' '}
          <strong>Simulation lab:</strong> original GOSIP fixtures. No live
          digital, space, aviation or maritime data is connected. Examples are
          never evidence of actual conditions.
        </li>
        <li>
          <strong>Globe:</strong> CesiumJS (Apache-2.0). Imagery: Esri World
          Imagery and boundaries/places reference layers; NASA GIBS VIIRS true
          colour and Black Marble night lights; optional Cesium ion terrain,
          imagery and Google photorealistic 3D tiles under non-commercial terms.
          Providers' on-globe credits are shown; NVG/IR modes are visual
          filters, not sensor data.
        </li>
        <li>
          <strong>Map:</strong> Natural Earth 4.1.0 public-domain geography via
          world-atlas 2.0.2. Boundaries are illustrative and may be outdated.{' '}
          <a
            href={assetPath('/MAP_DATA_LICENSE.txt')}
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth notice ↗
          </a>
          {' · '}
          <a
            href={assetPath('/WORLD_ATLAS_LICENSE.txt')}
            target="_blank"
            rel="noreferrer"
          >
            world-atlas notice ↗
          </a>
        </li>
        <li>
          <strong>Software:</strong> original GOSIP code, documentation and
          synthetic fixtures are Apache-2.0 licensed. Copyright 2026 GOSIP
          contributors. Dependencies and provider data retain their separate
          rights.{' '}
          <a href={assetPath('/LICENSE.txt')} target="_blank" rel="noreferrer">
            GOSIP Apache-2.0 license ↗
          </a>
          {' · '}
          <a href={assetPath('/NOTICE.txt')} target="_blank" rel="noreferrer">
            GOSIP notice ↗
          </a>
          {' · '}
          <a
            href={assetPath('/dependency-notices.txt')}
            target="_blank"
            rel="noreferrer"
          >
            Bundled dependency notices ↗
          </a>
        </li>
      </ul>
      <h3>Free access, bounded service</h3>
      <p>
        GitHub Pages logs visitor IP addresses for security. Its published
        limits include a 1 GB site and 100 GB/month soft bandwidth limit;
        throttling or withdrawal is possible. GOSIP has no global usage meter.
        We accept service interruption or unpublishing instead of paid upgrades.{' '}
        <a
          href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages"
          target="_blank"
          rel="noreferrer"
        >
          GitHub Pages privacy & hosting ↗
        </a>
      </p>
      <p>
        No paid fallback or automatic upgrade. Scheduled ingestion fetches each
        provider once per run for all visitors. Schedules can be delayed or
        disabled after 60 days without repository activity. Stale timestamps
        remain visible even if the pipeline stops. This is not an emergency
        service. No provider endorsement.
      </p>
    </div>
  )
}
