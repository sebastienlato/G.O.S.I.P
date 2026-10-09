// Reproducible local assets. Natural Earth is public domain; see public/MAP_DATA_LICENSE.txt.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo'
import { geoProject } from 'd3-geo-projection'
const atlas = JSON.parse(
  readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'),
)
const countries = feature(atlas, atlas.objects.countries)
// Natural Earth uses spherical rings crossing the dateline. D3's projection
// stream splits these into planar-safe polygons for MapLibre's GeoJSON source.
const planar = geoProject(
  countries,
  geoEquirectangular()
    .scale(180 / Math.PI)
    .translate([0, 0]),
)
function restoreLatitude(coordinates) {
  if (typeof coordinates[0] === 'number')
    return [coordinates[0], -coordinates[1]]
  return coordinates.map(restoreLatitude)
}
for (const country of planar.features) {
  country.geometry.coordinates = restoreLatitude(country.geometry.coordinates)
}
writeFileSync('public/world.geojson', JSON.stringify(planar))
const path = geoPath(
  geoEquirectangular()
    .scale(1000 / (2 * Math.PI))
    .translate([500, 250]),
)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><rect width="1000" height="500" fill="#0a1822"/><path d="${path(geoGraticule10())}" fill="none" stroke="#12242e" stroke-width="0.5"/>${countries.features.map((f) => `<path d="${path(f)}" fill="#1b2e37" stroke="#304956" stroke-width="0.5"/>`).join('')}</svg>`
writeFileSync('public/world.svg', svg)
copyFileSync(
  'node_modules/world-atlas/LICENSE',
  'public/WORLD_ATLAS_LICENSE.txt',
)
