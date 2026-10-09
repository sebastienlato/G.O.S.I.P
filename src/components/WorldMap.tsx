import { isMaritime } from '../data/maritime'
import { assetPath } from '../state/assetPath'
import { drawOrder, encode, type Encoding } from '../state/encoding'
import { iconSvg } from '../state/icons'
import {
  buildHeatCanvas,
  heatAlpha,
  HEAT_HEIGHT,
  HEAT_WIDTH,
} from '../state/heat'
import KindIcon from './KindIcon'
import MapLegend from './MapLegend'
import { useEffect, useMemo, useRef, useState } from 'react'
import type * as CesiumModule from '@cesium/engine'
import { Compass, Home, Minus, Plus } from 'lucide-react'
import {
  eventBadge,
  eventTime,
  markerLabel,
  type MappedEvent,
} from '../data/events'
import { isFireSummary } from '../data/firms'

type Cesium = typeof CesiumModule
export type Imagery = 'satellite' | 'today' | 'night'
export type Sensor = 'standard' | 'nvg' | 'ir'
type Props = {
  events: MappedEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
  focusRequest: { id: string; sequence: number } | null
  staticView: boolean
  onModeChange: (staticView: boolean) => void
  referenceTime: number
  /** Show the live legend. */
  live: boolean
}
type MapState = 'loading' | 'ready' | 'fallback'

const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim() || ''
const HOME = { lon: -35, lat: 20 }
const homeHeight = (width: number) => (width < 700 ? 1.55e7 : 2.05e7)
/** 3D cities take over below CITIES_ON and hand back above CITIES_OFF (m). */
const CITIES_ON = 250_000
const CITIES_OFF = 400_000
const reducedMotion = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches
const yesterday = () =>
  new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

const markerVars = (enc: Encoding) =>
  ({
    '--marker-color': enc.color,
    '--size': `${enc.size}px`,
    '--fresh': enc.freshness,
  }) as React.CSSProperties
const markerClass = (enc: Encoding) =>
  `event-marker kind-${enc.kind}${enc.recent ? ' recent' : ''}`

// Per-viewer display preferences (not shared in links).
function stored<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(`gosip.${key}`) as T | null
    return value && allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(`gosip.${key}`, value)
  } catch {
    /* Storage unavailable: preference lasts for this page only. */
  }
}

// Visual filters only: they recolour the rendered picture, they are not
// sensor data. Markers and readouts stay in true colour above the canvas.
const NVG = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture(colorTexture, v_textureCoordinates).rgb;
  float l = pow(dot(c, vec3(0.299, 0.587, 0.114)), 0.75) * 1.4;
  float n = rnd(v_textureCoordinates * 1300.0) * 0.07;
  float v = smoothstep(0.9, 0.3, distance(v_textureCoordinates, vec2(0.5)));
  out_FragColor = vec4(vec3(0.16, 1.0, 0.42) * (l + n) * mix(0.45, 1.0, v), 1.0);
}`
const IR = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
vec3 ramp(float t) {
  vec3 a = mix(vec3(0.0, 0.0, 0.04), vec3(0.16, 0.02, 0.55), smoothstep(0.0, 0.28, t));
  a = mix(a, vec3(0.78, 0.05, 0.52), smoothstep(0.28, 0.52, t));
  a = mix(a, vec3(1.0, 0.52, 0.05), smoothstep(0.52, 0.76, t));
  return mix(a, vec3(1.0, 0.98, 0.7), smoothstep(0.76, 1.0, t));
}
void main() {
  vec3 c = texture(colorTexture, v_textureCoordinates).rgb;
  float l = clamp(dot(c, vec3(0.299, 0.587, 0.114)) * 1.25, 0.0, 1.0);
  out_FragColor = vec4(ramp(l), 1.0);
}`

type Globe = {
  C: Cesium
  widget: CesiumModule.CesiumWidget
  overlay: HTMLDivElement
  markers: { el: HTMLButtonElement; cart: CesiumModule.Cartesian3 }[]
  /** FIRMS cell centre "lon,lat" → record id, for picking the heat field. */
  cells: Map<string, string>
  layers: Partial<
    Record<'base' | 'night' | 'heat' | 'maritime', CesiumModule.ImageryLayer>
  >
  tileset: CesiumModule.Cesium3DTileset | null
  stages: Record<'nvg' | 'ir', CesiumModule.PostProcessStage>
  target: CesiumModule.Cartesian3 | null
}

export default function WorldMap({
  events,
  selectedId,
  onSelect,
  focusRequest,
  staticView,
  onModeChange,
  referenceTime,
  live,
}: Props) {
  // Encode once per data change; draw big/old markers first so small fresh
  // ones stay clickable on top.
  const encoded = useMemo(
    () =>
      events
        .map((event) => ({
          event,
          enc: encode(event, referenceTime, eventTime(event)),
        }))
        .sort((a, b) => drawOrder(a.enc, b.enc)),
    [events, referenceTime],
  )
  // The legend explains only what is currently drawn.
  const shownKinds = useMemo(
    () => new Set(encoded.map(({ enc }) => enc.kind)),
    [encoded],
  )
  // FIRMS 2° cells: drawn as a heat field on both the globe and static map.
  const cells = useMemo(
    () =>
      encoded.flatMap(({ event }) =>
        isFireSummary(event)
          ? [
              {
                id: event.id,
                lon: event.coordinates[0],
                lat: event.coordinates[1],
                count: event.detection_count,
              },
            ]
          : [],
      ),
    [encoded],
  )
  const maritimeCells = useMemo(
    () =>
      encoded.flatMap(({ event }) =>
        isMaritime(event)
          ? [
              {
                id: event.id,
                lon: event.coordinates[0],
                lat: event.coordinates[1],
                count: event.count,
              },
            ]
          : [],
      ),
    [encoded],
  )
  const container = useRef<HTMLDivElement>(null)
  const credits = useRef<HTMLDivElement>(null)
  const reticle = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const altitude = useRef<HTMLSpanElement>(null)
  const globe = useRef<Globe | null>(null)
  const [state, setState] = useState<MapState>('loading')
  const [imagery, setImagery] = useState<Imagery>(() => {
    const saved = stored(
      'imagery',
      ['satellite', 'today', 'night'] as const,
      ionToken ? 'satellite' : 'today',
    )
    return saved === 'satellite' && !ionToken ? 'today' : saved
  })
  const [sensor, setSensor] = useState<Sensor>(() =>
    stored('sensor', ['standard', 'nvg', 'ir'] as const, 'standard'),
  )
  const [cities, setCities] = useState(
    () =>
      !!ionToken && stored('cities', ['on', 'off'] as const, 'off') === 'on',
  )
  const currentEvents = useRef(events)
  currentEvents.current = events
  const selected = useRef(selectedId)
  selected.current = selectedId
  const select = useRef(onSelect)
  select.current = onSelect

  // Create the globe once per interactive mount.
  useEffect(() => {
    if (staticView || !container.current) return
    let disposed = false
    let failed = false
    const fail = () => {
      failed = true
      if (!disposed) setState('fallback')
    }
    const timeout = window.setTimeout(fail, 15000)
    let clockTimer = 0
    setState('loading')
    window.CESIUM_BASE_URL = assetPath('/cesium/')
    void Promise.all([
      import('@cesium/engine'),
      import('@cesium/engine/Source/Widget/CesiumWidget.css'),
    ])
      .then(async ([C]) => {
        if (disposed || !container.current) return
        C.Ion.defaultAccessToken = ionToken
        const widget = new C.CesiumWidget(container.current, {
          baseLayer: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          shouldAnimate: false,
          creditContainer: credits.current ?? undefined,
          useBrowserRecommendedResolution: true,
        })
        const { scene, camera } = widget
        const g = scene.globe
        scene.backgroundColor = C.Color.BLACK
        g.baseColor = C.Color.fromCssColorString('#06121a')
        g.enableLighting = false
        // Limb glow only, no ground haze: imagery and data colours stay vivid.
        g.showGroundAtmosphere = false
        g.depthTestAgainstTerrain = false
        scene.fog.enabled = true
        if (scene.skyAtmosphere) scene.skyAtmosphere.show = true
        scene.postProcessStages.fxaa.enabled = true
        // Keep the scene clock on real UTC (sun/moon/sky positions).
        const tick = () => {
          widget.clock.currentTime = C.JulianDate.fromDate(new Date())
          scene.requestRender()
        }
        tick()
        clockTimer = window.setInterval(tick, 60_000)
        const ssc = scene.screenSpaceCameraController
        ssc.minimumZoomDistance = 40
        ssc.maximumZoomDistance = 4.5e7
        camera.setView({
          destination: C.Cartesian3.fromDegrees(
            HOME.lon,
            HOME.lat,
            homeHeight(container.current.clientWidth),
          ),
        })
        // Bundled Natural Earth II stays underneath, so the planet renders
        // even when external imagery is blocked or offline.
        widget.imageryLayers.add(
          C.ImageryLayer.fromProviderAsync(
            C.TileMapServiceImageryProvider.fromUrl(
              C.buildModuleUrl('Assets/Textures/NaturalEarthII'),
            ),
          ),
        )
        const stages = {
          nvg: new C.PostProcessStage({ fragmentShader: NVG }),
          ir: new C.PostProcessStage({ fragmentShader: IR }),
        }
        stages.nvg.enabled = false
        stages.ir.enabled = false
        scene.postProcessStages.add(stages.nvg)
        scene.postProcessStages.add(stages.ir)
        if (ionToken) {
          try {
            scene.setTerrain(C.Terrain.fromWorldTerrain())
          } catch {
            /* Terrain is optional; the ellipsoid remains. */
          }
        }
        const overlay = document.createElement('div')
        overlay.className = 'marker-layer'
        container.current.append(overlay)
        globe.current = {
          C,
          widget,
          overlay,
          markers: [],
          cells: new Map(),
          layers: {},
          tileset: null,
          stages,
          target: null,
        }

        // Screen-space overlay: accessible DOM markers follow the globe.
        const scratch = new C.Cartesian2()
        const toCamera = new C.Cartesian3()
        scene.postRender.addEventListener(() => {
          const current = globe.current
          if (!current) return
          const eye = camera.positionWC
          // Horizon test: hide marks on the far side of the planet.
          const place = (el: HTMLElement, cart: CesiumModule.Cartesian3) => {
            const p =
              C.Cartesian3.dot(
                cart,
                C.Cartesian3.subtract(eye, cart, toCamera),
              ) > 0 &&
              C.SceneTransforms.worldToWindowCoordinates(scene, cart, scratch)
            if (!p) {
              el.hidden = true
              return
            }
            el.hidden = false
            // Only touch the DOM when the projected position actually moved.
            const next = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`
            if (el.style.transform !== next) el.style.transform = next
          }
          for (const m of current.markers) place(m.el, m.cart)
          if (reticle.current) {
            if (current.target) place(reticle.current, current.target)
            else reticle.current.hidden = true
          }
          const density = current.layers.maritime
          if (density)
            density.alpha = heatAlpha(camera.positionCartographic.height)
          const heat = current.layers.heat
          if (heat) {
            const alpha = heatAlpha(camera.positionCartographic.height)
            if (Math.abs(heat.alpha - alpha) > 0.01) {
              heat.alpha = heat.dayAlpha = alpha
              heat.nightAlpha = Math.min(1, alpha + 0.08)
              scene.requestRender()
            }
          }
          // Photorealistic 3D tiles cover the whole planet and hide every
          // imagery layer (heat, night), so they only take over near
          // the ground; hysteresis avoids flicker at the threshold.
          const tiles = current.tileset
          if (tiles) {
            const close =
              camera.positionCartographic.height <
              (tiles.show ? CITIES_OFF : CITIES_ON)
            if (tiles.show !== close || scene.globe.show === close) {
              tiles.show = close
              scene.globe.show = !close
              scene.requestRender()
            }
          }
          if (altitude.current) {
            const h = camera.positionCartographic.height
            altitude.current.textContent =
              h > 10_000
                ? `${Math.round(h / 1000).toLocaleString('en-GB')} km`
                : `${Math.round(h).toLocaleString('en-GB')} m`
          }
        })

        const handler = new C.ScreenSpaceEventHandler(scene.canvas)
        handler.setInputAction((e: { position: CesiumModule.Cartesian2 }) => {
          const picked = scene.pick(e.position)
          const id = picked?.id
          if (typeof id === 'string') return select.current(id)
          // The heat field is imagery; resolve clicks to the 2° cell beneath.
          const cart = camera.pickEllipsoid(e.position)
          const cells = globe.current?.cells
          if (!cart || !cells?.size) return
          const c = C.Cartographic.fromCartesian(cart)
          const cell = (deg: number) => 2 * Math.floor(deg / 2) + 1
          const broad = (deg: number) => 10 * Math.floor(deg / 10) + 5
          const maritimeHit = cells.get(
            `maritime:${broad(C.Math.toDegrees(c.longitude))},${broad(C.Math.toDegrees(c.latitude))}`,
          )
          const hit =
            maritimeHit ??
            cells.get(
              `${cell(C.Math.toDegrees(c.longitude))},${cell(C.Math.toDegrees(c.latitude))}`,
            )
          if (hit) select.current(hit)
        }, C.ScreenSpaceEventType.LEFT_CLICK)
        let frame = 0
        handler.setInputAction(
          (e: { endPosition: CesiumModule.Cartesian2 }) => {
            if (frame) return
            frame = requestAnimationFrame(() => {
              frame = 0
              const cart = camera.pickEllipsoid(e.endPosition)
              if (!readout.current) return
              if (!cart) {
                readout.current.textContent = 'Off globe'
                return
              }
              const c = C.Cartographic.fromCartesian(cart)
              const lat = C.Math.toDegrees(c.latitude)
              const lon = C.Math.toDegrees(c.longitude)
              readout.current.textContent = `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`
            })
          },
          C.ScreenSpaceEventType.MOUSE_MOVE,
        )
        scene.canvas.setAttribute(
          'aria-label',
          'Interactive 3D globe. Drag to rotate, scroll or pinch to zoom. Every record is also in the feed.',
        )
        scene.canvas.addEventListener('webglcontextlost', fail)
        scene.renderError.addEventListener(fail)
        window.clearTimeout(timeout)
        if (!disposed && !failed) setState('ready')
      })
      .catch((error: unknown) => {
        console.error('Globe unavailable', error)
        fail()
      })
    return () => {
      disposed = true
      window.clearTimeout(timeout)
      window.clearInterval(clockTimer)
      const current = globe.current
      globe.current = null
      if (current && !current.widget.isDestroyed()) {
        current.overlay.remove()
        current.widget.destroy()
      }
    }
  }, [staticView])

  // Imagery: NASA GIBS without an ion token; no unlicensed keyless tiles.
  useEffect(() => {
    const current = globe.current
    if (state !== 'ready' || !current) return
    const { C, widget, layers } = current
    const list = widget.imageryLayers
    for (const key of ['base', 'night'] as const) {
      if (layers[key]) list.remove(layers[key]!, true)
      delete layers[key]
    }
    const template = (url: string, credit: string, maximumLevel: number) =>
      new C.ImageryLayer(
        new C.UrlTemplateImageryProvider({ url, credit, maximumLevel }),
      )
    const gibs = (layer: string, date: string, level: number, ext: string) =>
      template(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`,
        'Imagery: NASA GIBS / EOSDIS',
        level,
      )
    const base =
      imagery === 'today'
        ? gibs(
            'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
            yesterday(),
            9,
            'jpg',
          )
        : imagery === 'night'
          ? gibs('VIIRS_Black_Marble', '2016-01-01', 8, 'png')
          : ionToken
            ? C.ImageryLayer.fromProviderAsync(
                C.createWorldImageryAsync({
                  style: C.IonWorldImageryStyle.AERIAL,
                }),
              )
            : gibs(
                'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
                yesterday(),
                9,
                'jpg',
              )
    list.add(base)
    layers.base = base
    if (layers.heat) list.raiseToTop(layers.heat)
    if (layers.maritime) list.raiseToTop(layers.maritime)
    // Evenly lit globe: a hard day/night terminator hid data and imagery.
    widget.scene.globe.enableLighting = false
    widget.scene.requestRender()
    store('imagery', imagery)
  }, [imagery, state])

  // Optional photorealistic 3D cities (Cesium ion, non-commercial quota).
  useEffect(() => {
    const current = globe.current
    if (state !== 'ready' || !current || !ionToken) return
    const { C, widget } = current
    let cancelled = false
    if (cities && !current.tileset) {
      void C.createGooglePhotorealistic3DTileset()
        .then((tileset) => {
          if (cancelled || !globe.current) return tileset.destroy()
          // Shown/hidden by camera height in postRender.
          tileset.show = false
          widget.scene.primitives.add(tileset)
          globe.current.tileset = tileset
          widget.scene.requestRender()
        })
        .catch(() => setCities(false))
    }
    if (!cities && current.tileset) {
      widget.scene.primitives.remove(current.tileset)
      current.tileset = null
      widget.scene.globe.show = true
      widget.scene.requestRender()
    }
    store('cities', cities ? 'on' : 'off')
    return () => {
      cancelled = true
    }
  }, [cities, state])

  useEffect(() => {
    const current = globe.current
    if (state !== 'ready' || !current) return
    current.stages.nvg.enabled = sensor === 'nvg'
    current.stages.ir.enabled = sensor === 'ir'
    current.widget.scene.requestRender()
    store('sensor', sensor)
  }, [sensor, state])

  // Data: thermal cells as a smooth heat field draped on the globe, every
  // other record as an accessible DOM marker projected from the globe.
  useEffect(() => {
    const current = globe.current
    if (state !== 'ready' || !current) return
    const { C, widget, overlay, layers } = current
    overlay.replaceChildren()
    current.markers = []
    current.cells = new Map()
    if (layers.heat) {
      widget.imageryLayers.remove(layers.heat, true)
      delete layers.heat
    }
    if (cells.length) {
      for (const c of cells) current.cells.set(`${c.lon},${c.lat}`, c.id)
      const heat = new C.ImageryLayer(
        new C.SingleTileImageryProvider({
          url: buildHeatCanvas(cells).toDataURL('image/png'),
          tileWidth: HEAT_WIDTH,
          tileHeight: HEAT_HEIGHT,
          rectangle: C.Rectangle.fromDegrees(-180, -90, 180, 90),
          credit: 'Thermal: NASA FIRMS, aggregated by GOSIP',
        }),
      )
      heat.alpha = heat.dayAlpha = heatAlpha(
        widget.camera.positionCartographic.height,
      )
      heat.nightAlpha = Math.min(1, heat.alpha + 0.08)
      widget.imageryLayers.add(heat)
      layers.heat = heat
    }
    if (layers.maritime) {
      widget.imageryLayers.remove(layers.maritime, true)
      delete layers.maritime
    }
    if (maritimeCells.length) {
      for (const c of maritimeCells)
        current.cells.set(`maritime:${c.lon},${c.lat}`, c.id)
      const density = new C.ImageryLayer(
        new C.SingleTileImageryProvider({
          url: buildHeatCanvas(maritimeCells, 'maritime').toDataURL(
            'image/png',
          ),
          tileWidth: HEAT_WIDTH,
          tileHeight: HEAT_HEIGHT,
          rectangle: C.Rectangle.fromDegrees(-180, -90, 180, 90),
          credit:
            'Port estimates: UN Global Platform; IMF PortWatch · selected and aggregated by GOSIP',
        }),
      )
      density.alpha = heatAlpha(widget.camera.positionCartographic.height)
      widget.imageryLayers.add(density)
      layers.maritime = density
    }
    for (const { event, enc } of encoded) {
      if (isFireSummary(event) || isMaritime(event)) continue
      const el = document.createElement('button')
      el.className = markerClass(enc)
      el.dataset.eventId = event.id
      for (const [key, value] of Object.entries(markerVars(enc)))
        el.style.setProperty(key, String(value))
      el.setAttribute('aria-label', markerLabel(event))
      el.classList.toggle('selected', event.id === selected.current)
      el.setAttribute('aria-pressed', String(event.id === selected.current))
      el.title = `${event.title} · ${eventBadge(event)}`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        el.focus({ preventScroll: true })
        select.current(event.id)
      })
      const mark = document.createElement('span')
      // Constant local icon markup (src/state/icons.ts), never record data.
      if (enc.kind !== 'quake') mark.innerHTML = iconSvg(enc.kind)
      el.append(mark)
      overlay.append(el)
      current.markers.push({
        el,
        cart: C.Cartesian3.fromDegrees(
          event.coordinates[0],
          event.coordinates[1],
        ),
      })
    }
    widget.scene.requestRender()
  }, [encoded, cells, maritimeCells, state])

  // Selection: marker state plus a target reticle (works for cells too).
  useEffect(() => {
    const current = globe.current
    if (state !== 'ready' || !current) return
    for (const { el } of current.markers) {
      const on = el.dataset.eventId === selectedId
      el.classList.toggle('selected', on)
      el.setAttribute('aria-pressed', String(on))
    }
    const event = currentEvents.current.find((e) => e.id === selectedId)
    current.target = event
      ? current.C.Cartesian3.fromDegrees(
          event.coordinates[0],
          event.coordinates[1],
        )
      : null
    if (reticle.current && event)
      reticle.current.dataset.label = event.coordinates
        .map(
          (v, i) =>
            `${Math.abs(v).toFixed(2)}° ${i ? (v >= 0 ? 'N' : 'S') : v >= 0 ? 'E' : 'W'}`,
        )
        .reverse()
        .join('  ')
    current.widget.scene.requestRender()
  }, [selectedId, state, encoded])

  useEffect(() => {
    const current = globe.current
    if (!focusRequest || staticView || state !== 'ready' || !current) return
    const event = currentEvents.current.find((e) => e.id === focusRequest.id)
    if (!event) return
    current.widget.camera.flyTo({
      destination: current.C.Cartesian3.fromDegrees(
        event.coordinates[0],
        event.coordinates[1],
        isMaritime(event)
          ? 3_500_000
          : isFireSummary(event)
            ? 900_000
            : 1_400_000,
      ),
      duration: reducedMotion() ? 0 : 1.8,
    })
    // Only an explicit request changes the camera; filtering never does.
  }, [focusRequest, state, staticView])

  const camera = (action: 'in' | 'out' | 'home' | 'north') => {
    const current = globe.current
    if (!current) return
    const { C, widget } = current
    const cam = widget.camera
    const h = cam.positionCartographic.height
    const duration = reducedMotion() ? 0 : 1.2
    if (action === 'in') cam.zoomIn(h * 0.5)
    if (action === 'out') cam.zoomOut(h)
    if (action === 'home')
      cam.flyTo({
        destination: C.Cartesian3.fromDegrees(
          HOME.lon,
          HOME.lat,
          homeHeight(container.current?.clientWidth ?? 1200),
        ),
        duration,
      })
    if (action === 'north')
      cam.flyTo({
        destination: cam.positionWC.clone(),
        orientation: { heading: 0, pitch: cam.pitch, roll: 0 },
        duration,
      })
    widget.scene.requestRender()
  }

  const useFallback = staticView || state === 'fallback'
  const loading = !staticView && state === 'loading'
  const staticHeat = useMemo(
    () =>
      useFallback && cells.length
        ? buildHeatCanvas(cells).toDataURL('image/png')
        : '',
    [useFallback, cells],
  )
  const staticMaritime = useMemo(
    () =>
      useFallback && maritimeCells.length
        ? buildHeatCanvas(maritimeCells, 'maritime').toDataURL('image/png')
        : '',
    [useFallback, maritimeCells],
  )
  // Static map: clicks on the heat field resolve to the 2° cell beneath.
  const pickStaticCell = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (!cells.length && !maritimeCells.length)
    )
      return
    const box = e.currentTarget.getBoundingClientRect()
    const lon = ((e.clientX - box.left) / box.width) * 360 - 180
    const lat = 90 - ((e.clientY - box.top) / box.height) * 180
    const cell = (deg: number) => 2 * Math.floor(deg / 2) + 1
    const broad = (deg: number) => 10 * Math.floor(deg / 10) + 5
    const hit =
      maritimeCells.find((c) => c.lon === broad(lon) && c.lat === broad(lat)) ??
      cells.find((c) => c.lon === cell(lon) && c.lat === cell(lat))
    if (hit) onSelect(hit.id)
  }
  return (
    <section className="map-scene" aria-label="Event map">
      <div
        ref={container}
        className={`map-canvas ${useFallback ? 'map-hidden' : ''}`}
        aria-hidden={useFallback}
      />
      {useFallback && (
        <div className="static-map" data-testid="static-map">
          {/* Mouse shortcut only; every cell is also a feed card. */}
          <div className="static-world" onClick={pickStaticCell}>
            <img
              src={assetPath('/world.svg')}
              alt="World map with approximate regional event locations"
            />
            {staticMaritime && (
              <img
                className="static-heat maritime-heat"
                src={staticMaritime}
                alt=""
                aria-hidden="true"
              />
            )}
            {staticHeat && (
              <img
                className="static-heat"
                src={staticHeat}
                alt=""
                aria-hidden="true"
              />
            )}
            {encoded.map(({ event, enc }) =>
              isFireSummary(event) || isMaritime(event) ? null : (
                <button
                  key={event.id}
                  className={`${markerClass(enc)} static-marker ${selectedId === event.id ? 'selected' : ''}`}
                  style={{
                    left: `${(event.coordinates[0] + 180) / 3.6}%`,
                    top: `${(90 - event.coordinates[1]) / 1.8}%`,
                    ...markerVars(enc),
                  }}
                  aria-label={markerLabel(event)}
                  aria-pressed={selectedId === event.id}
                  title={`${event.title} · ${eventBadge(event)}`}
                  onClick={() => onSelect(event.id)}
                >
                  <span>
                    {enc.kind !== 'quake' && <KindIcon kind={enc.kind} />}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      )}
      {!useFallback && (
        <>
          <div className="hud-frame" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div
            ref={reticle}
            className="target-reticle"
            hidden
            aria-hidden="true"
          />
          {loading && (
            <p className="globe-loading" role="status">
              Acquiring globe…
            </p>
          )}
          <div className="hud-modes" role="group" aria-label="Globe display">
            <div className="hud-seg" role="group" aria-label="Imagery">
              {(
                [
                  [
                    'satellite',
                    'Satellite',
                    'High-resolution satellite basemap',
                  ],
                  [
                    'today',
                    'NASA today',
                    `NASA VIIRS true colour, ${yesterday()} (latest complete day)`,
                  ],
                  [
                    'night',
                    'Night',
                    'NASA Black Marble night lights (2016 composite)',
                  ],
                ] as const
              )
                .filter(([key]) => key !== 'satellite' || !!ionToken)
                .map(([key, label, title]) => (
                  <button
                    key={key}
                    title={title}
                    aria-pressed={imagery === key}
                    onClick={() => setImagery(key)}
                  >
                    {label}
                  </button>
                ))}
            </div>
            <div
              className="hud-seg"
              role="group"
              aria-label="Visual filter (not sensor data)"
            >
              {(
                [
                  ['standard', 'Std', 'Standard colour'],
                  [
                    'nvg',
                    'NVG',
                    'Night-vision look (visual filter, not sensor data)',
                  ],
                  [
                    'ir',
                    'IR',
                    'Infrared-palette look (visual filter, not thermal data)',
                  ],
                ] as const
              ).map(([key, label, title]) => (
                <button
                  key={key}
                  title={title}
                  aria-label={title}
                  aria-pressed={sensor === key}
                  onClick={() => setSensor(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {ionToken && (
              <div className="hud-seg" role="group" aria-label="Overlays">
                <button
                  aria-pressed={cities}
                  title="Photorealistic 3D cities below 250 km (Google via Cesium ion)"
                  onClick={() => setCities(!cities)}
                >
                  3D cities
                </button>
              </div>
            )}
          </div>
          <div className="hud-readout" aria-hidden="true">
            <span>
              <b>Pos</b> <span ref={readout}>—</span>
            </span>
            <span>
              <b>Alt</b> <span ref={altitude}>—</span>
            </span>
          </div>
        </>
      )}
      <div className="map-controls">
        <button
          aria-label="Zoom in"
          disabled={useFallback}
          onClick={() => camera('in')}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Zoom out"
          disabled={useFallback}
          onClick={() => camera('out')}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Reset map view"
          disabled={useFallback}
          onClick={() => camera('home')}
        >
          <Home size={16} />
        </button>
        <button
          aria-label="Face north"
          disabled={useFallback}
          onClick={() => camera('north')}
        >
          <Compass size={16} />
        </button>
      </div>
      {live && <MapLegend shown={shownKinds} />}
      <div className="map-bottom">
        <span className="map-mode">
          {staticView
            ? 'Static map'
            : state === 'ready'
              ? 'Interactive map'
              : state === 'loading'
                ? 'Starting interactive map…'
                : 'Map unavailable · static fallback'}
        </span>
        <button
          className="map-switch"
          aria-pressed={staticView}
          onClick={() => onModeChange(!staticView)}
        >
          {staticView ? 'Use interactive map' : 'Use static map'}
        </button>
      </div>
      <div className="map-credit">
        <div ref={credits} className="globe-credits" />
        <span>
          Base geography{' '}
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>{' '}
          · Approximate locations
        </span>
      </div>
    </section>
  )
}
