import type { MarkerKind } from '../state/encoding'
import { iconMarkup } from '../state/icons'

/** Line icon for a record kind, coloured by `color` (defaults to currentColor). */
export default function KindIcon({
  kind,
  color,
  size = 16,
}: {
  kind: MarkerKind
  color?: string
  size?: number
}) {
  return (
    <svg
      className="kind-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // Constant, local markup (src/state/icons.ts); never user data.
      dangerouslySetInnerHTML={{ __html: iconMarkup[kind] }}
    />
  )
}
