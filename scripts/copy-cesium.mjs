// Copy the CesiumJS runtime assets the globe needs into public/cesium/
// (gitignored). Only what GOSIP uses is copied, to respect the site budget:
// workers, decoders (draco/basis for 3D tiles), terrain heights, the
// bundled Natural Earth II imagery (offline base) and the star sky box.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const from = 'node_modules/cesium/Build/Cesium'
const to = 'public/cesium'
const keep = [
  'Workers',
  'ThirdParty',
  'Assets/approximateTerrainHeights.json',
  'Assets/Images',
  'Assets/IAU2006_XYS',
  'Assets/Textures/NaturalEarthII',
  'Assets/Textures/SkyBox',
  'Assets/Textures/moonSmall.jpg',
  'Widgets/CesiumWidget',
]
if (!existsSync(from)) throw Error('Run npm ci first: cesium is missing')
rmSync(to, { recursive: true, force: true })
for (const path of keep) {
  mkdirSync(join(to, path, '..'), { recursive: true })
  cpSync(join(from, path), join(to, path), { recursive: true })
}
console.log(`Copied ${keep.length} Cesium asset groups to ${to}`)
