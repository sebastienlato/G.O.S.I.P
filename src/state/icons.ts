import type { MarkerKind } from './encoding'

// One line-icon set (24-unit grid, 2px round strokes) shared by globe
// markers, the layer panel, feed cards and the legend. Static markup only.
export const iconMarkup: Record<MarkerKind, string> = {
  ooni: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="m6 8 5 9m7-9-5 9M8 6h8"/>',
  // Seismogram trace.
  quake: '<path d="M2 12h4l2.5-6 3 12 3-9 2 3h5.5"/>',
  // Flat-topped cone with an ash plume.
  volcano:
    '<path d="M2.5 20.5 9 9.5h6l6.5 11Z"/><path d="M10.5 6.2c-.9-1.6.6-3.3 2.2-2.6.9-1.5 3.5-.9 3.3 1.1"/>',
  // Tropical cyclone symbol: eye with two spiral arms.
  storm:
    '<circle cx="12" cy="12" r="2.6"/><path d="M14.6 12c0-5 3.4-8 7.4-8"/><path d="M9.4 12c0 5-3.4 8-7.4 8"/>',
  fire: '<path d="M12 2.5c.6 3.2 3.9 5 4.9 8.6.9 3.4-1.4 7.4-4.9 7.4s-5.8-3-5-6.4c.4-1.6 1.4-2.7 2.4-3.4-.1 1.7.5 2.9 1.6 3.3-.4-3.6.4-6.6 1-9.5Z"/><path d="M8 21.5h8"/>',
  warning:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  news: '<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5"/><path d="M9 12h7"/><path d="M9 16h5"/>',
  example:
    '<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
}

export const iconSvg = (kind: MarkerKind) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconMarkup[kind]}</svg>`
