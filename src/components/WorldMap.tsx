import { assetPath } from '../state/assetPath'
import { drawOrder, encode, type Encoding } from '../state/encoding'
import MapLegend from './MapLegend'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MapInstance, Marker } from 'maplibre-gl'
import { Globe2, Minus, Plus, RotateCcw } from 'lucide-react'
import {
  eventBadge,
  eventTime,
  markerLabel,
  type MappedEvent,
} from '../data/events'
import type { FeatureCollection } from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

type Props = {
  events: MappedEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
  focusRequest: { id: string; sequence: number } | null
  staticView: boolean
  onModeChange: (staticView: boolean) => void
  referenceTime: number
  /** Show the live magnitude/hazard legend. */
  live: boolean
}
const markerVars = (enc: Encoding) =>
  ({
    '--marker-color': enc.color,
    '--size': `${enc.size}px`,
    '--fresh': enc.freshness,
  }) as React.CSSProperties
const markerClass = (enc: Encoding) =>
  `event-marker kind-${enc.kind}${enc.recent ? ' recent' : ''}`
type MapState = 'loading' | 'ready' | 'fallback'
// Chart graticule every 30°, drawn under land: the "night chart" signature.
const graticule: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    ...[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: Array.from({ length: 33 }, (_, i) => [lon, -80 + i * 5]),
      },
    })),
    ...[-60, -30, 0, 30, 60].map((lat) => ({
      type: 'Feature' as const,
      properties: { equator: lat === 0 },
      geometry: {
        type: 'LineString' as const,
        coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]),
      },
    })),
  ],
}
const overviewZoom = (width: number) =>
  Math.min(1.2, Math.log2(Math.max(width, 280) / 512) - 0.12)

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
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapInstance | null>(null)
  const markers = useRef<Marker[]>([])
  const [state, setState] = useState<MapState>('loading')
  const currentEvents = useRef(events)
  currentEvents.current = events
  const selected = useRef(selectedId)
  selected.current = selectedId

  useEffect(() => {
    if (staticView || !container.current) return
    let disposed = false
    let failed = false
    let instance: MapInstance | undefined
    let observer: ResizeObserver | undefined
    const fail = () => {
      failed = true
      if (!disposed) setState('fallback')
    }
    const timeout = window.setTimeout(fail, 12000)
    setState('loading')
    void Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
      .then(([{ Map, setWorkerUrl }]) => {
        if (disposed || !container.current) return
        // Vite relocates the main module; explicitly bundle its adjacent worker.
        setWorkerUrl(workerUrl)
        instance = new Map({
          container: container.current,
          center: [0, 15],
          zoom: overviewZoom(container.current.clientWidth),
          minZoom: -2,
          maxZoom: 5,
          renderWorldCopies: false,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: true,
          style: {
            version: 8,
            sources: {
              world: {
                type: 'geojson',
                data: assetPath('/world.geojson'),
                attribution: 'Natural Earth · public domain',
              },
              graticule: { type: 'geojson', data: graticule },
            },
            layers: [
              {
                id: 'ocean',
                type: 'background',
                paint: { 'background-color': '#0a1822' },
              },
              {
                id: 'graticule',
                type: 'line',
                source: 'graticule',
                paint: {
                  'line-color': '#1b3a4b',
                  'line-width': ['case', ['get', 'equator'], 1, 0.6],
                  'line-dasharray': [2, 3],
                },
              },
              {
                id: 'land',
                type: 'fill',
                source: 'world',
                paint: { 'fill-color': '#1b2e37' },
              },
              {
                id: 'borders',
                type: 'line',
                source: 'world',
                paint: { 'line-color': '#304956', 'line-width': 0.5 },
              },
            ],
          },
        })
        map.current = instance
        instance.touchZoomRotate.disableRotation()
        instance
          .getCanvas()
          .setAttribute(
            'aria-label',
            'Interactive world map. Event markers are keyboard accessible; all events are also in the feed.',
          )
        instance.getCanvas().addEventListener('webglcontextlost', fail)
        instance.on('error', fail)
        instance.on('load', () => {
          window.clearTimeout(timeout)
          if (!disposed && !failed) setState('ready')
        })
        observer = new ResizeObserver(() => instance?.resize())
        observer.observe(container.current)
      })
      .catch(fail)
    return () => {
      disposed = true
      window.clearTimeout(timeout)
      observer?.disconnect()
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
      instance?.remove()
      map.current = null
    }
  }, [staticView])

  useEffect(() => {
    if (state !== 'ready' || staticView || !map.current) return
    let disposed = false
    void import('maplibre-gl').then(({ Marker: MapMarker }) => {
      if (disposed || !map.current) return
      markers.current.forEach((marker) => marker.remove())
      markers.current = encoded.map(({ event, enc }) => {
        const button = document.createElement('button')
        button.className = markerClass(enc)
        button.dataset.eventId = event.id
        for (const [key, value] of Object.entries(markerVars(enc)))
          button.style.setProperty(key, String(value))
        button.setAttribute('aria-label', markerLabel(event))
        button.classList.toggle('selected', event.id === selected.current)
        button.setAttribute(
          'aria-pressed',
          String(event.id === selected.current),
        )
        button.title = `${event.title} · ${eventBadge(event)}`
        button.addEventListener('click', (clickEvent) => {
          clickEvent.stopPropagation()
          button.focus({ preventScroll: true })
          onSelect(event.id)
        })
        button.append(document.createElement('span'))
        return new MapMarker({ element: button })
          .setLngLat(event.coordinates)
          .addTo(map.current!)
      })
    })
    return () => {
      disposed = true
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
    }
  }, [encoded, onSelect, state, staticView])

  useEffect(() => {
    markers.current.forEach((marker) => {
      const element = marker.getElement()
      const selected = element.dataset.eventId === selectedId
      element.classList.toggle('selected', selected)
      element.setAttribute('aria-pressed', String(selected))
    })
  }, [selectedId])

  useEffect(() => {
    if (!focusRequest || staticView || state !== 'ready' || !map.current) return
    const event = currentEvents.current.find(
      (event) => event.id === focusRequest.id,
    )
    if (event) {
      // A wider viewport needs a closer regional view to keep eastern/western
      // markers away from the camera's single-world longitude constraint.
      const width = container.current?.clientWidth ?? 800
      const edgeDegrees = Math.max(1, 180 - Math.abs(event.coordinates[0]))
      const zoom = Math.min(
        5,
        Math.max(2, Math.log2((width * 180) / (512 * edgeDegrees)) + 0.1),
      )
      map.current.jumpTo({ center: event.coordinates, zoom })
    }
    // Only an explicit request (or newly ready map) changes the camera.
    // Filtering must not take over a camera the reader has moved themselves.
  }, [focusRequest, state, staticView])

  const useFallback = staticView || state !== 'ready'
  return (
    <section className="map-scene" aria-label="Event map">
      <div
        ref={container}
        className={`map-canvas ${useFallback ? 'map-hidden' : ''}`}
        aria-hidden={useFallback}
      />
      {useFallback && (
        <div className="static-map" data-testid="static-map">
          <div className="static-world">
            <img
              src={assetPath('/world.svg')}
              alt="World map with approximate regional event locations"
            />
            {encoded.map(({ event, enc }) => (
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
                <span />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="map-controls">
        <button
          aria-label="Zoom in"
          disabled={useFallback}
          onClick={() => map.current?.zoomIn()}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Zoom out"
          disabled={useFallback}
          onClick={() => map.current?.zoomOut()}
        >
          <Minus size={18} />
        </button>
        <button
          aria-label="Reset map view"
          disabled={useFallback}
          onClick={() =>
            map.current?.jumpTo({
              center: [0, 15],
              zoom: overviewZoom(container.current?.clientWidth ?? 800),
            })
          }
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {live && <MapLegend />}
      <div className="map-bottom">
        <span className="map-mode">
          <Globe2 size={13} />
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
        Made with{' '}
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth
        </a>{' '}
        · Approximate locations
      </div>
    </section>
  )
}
