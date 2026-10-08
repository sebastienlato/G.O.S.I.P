import { locationMeaning } from '../data/events'
import { useEffect, useRef, useState } from 'react'
import type { Map as MapInstance, Marker } from 'maplibre-gl'
import { Globe2, Minus, Plus, RotateCcw } from 'lucide-react'
import {
  categories,
  eventBadge,
  markerLabel,
  type ExplorerEvent,
} from '../data/events'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

type Props = {
  events: ExplorerEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
  focusRequest: { id: string; sequence: number } | null
  staticView: boolean
  onModeChange: (staticView: boolean) => void
}
type MapState = 'loading' | 'ready' | 'fallback'
const overviewZoom = (width: number) =>
  Math.min(1.2, Math.log2(Math.max(width, 280) / 512) - 0.12)

export default function WorldMap({
  events,
  selectedId,
  onSelect,
  focusRequest,
  staticView,
  onModeChange,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapInstance | null>(null)
  const markers = useRef<Marker[]>([])
  const [state, setState] = useState<MapState>('loading')
  const currentEvents = useRef(events)
  currentEvents.current = events
  const selected = useRef(selectedId)
  selected.current = selectedId
  const selectedEvent = events.find((event) => event.id === selectedId)

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
                data: '/world.geojson',
                attribution: 'Natural Earth · public domain',
              },
            },
            layers: [
              {
                id: 'ocean',
                type: 'background',
                paint: { 'background-color': '#142025' },
              },
              {
                id: 'land',
                type: 'fill',
                source: 'world',
                paint: { 'fill-color': '#2d4145' },
              },
              {
                id: 'borders',
                type: 'line',
                source: 'world',
                paint: { 'line-color': '#506466', 'line-width': 0.6 },
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
      markers.current = events.map((event) => {
        const button = document.createElement('button')
        button.className = 'event-marker'
        button.dataset.eventId = event.id
        button.style.setProperty(
          '--marker-color',
          categories[event.category].color,
        )
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
        const dot = document.createElement('span')
        dot.textContent = '•'
        button.append(dot)
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
  }, [events, onSelect, state, staticView])

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
              src="/world.svg"
              alt="World map with approximate regional event locations"
            />
            {events.map((event) => (
              <button
                key={event.id}
                className={`event-marker static-marker ${selectedId === event.id ? 'selected' : ''}`}
                style={
                  {
                    left: `${(event.coordinates[0] + 180) / 3.6}%`,
                    top: `${(90 - event.coordinates[1]) / 1.8}%`,
                    '--marker-color': categories[event.category].color,
                  } as React.CSSProperties
                }
                aria-label={markerLabel(event)}
                aria-pressed={selectedId === event.id}
                onClick={() => onSelect(event.id)}
              >
                <span>•</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="map-heading">
        <span className="eyebrow">
          {selectedEvent
            ? `SELECTED · ${eventBadge(selectedEvent)}`
            : 'A WORLD IN CONTEXT'}
        </span>
        <h2>
          {selectedEvent
            ? selectedEvent.country || 'Earthquake observation'
            : 'Explore the signals.'}
        </h2>
        <p>
          {selectedEvent
            ? `${selectedEvent.region} · ${locationMeaning(selectedEvent)}`
            : 'Choose a marker or explore the event feed.'}
        </p>
      </div>
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
