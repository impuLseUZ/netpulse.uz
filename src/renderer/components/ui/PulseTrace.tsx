/**
 * NetPulse's signature: a live oscilloscope-style trace line, used wherever
 * something is actively running (ping stream, scan, transfer, SSH session).
 * Replaces the old static pulsing dot — this one moves.
 */
export function PulseTrace({
  active = true,
  color = 'accent',
  width = 40,
  height = 14,
  className
}: {
  active?: boolean
  color?: 'accent' | 'ok' | 'danger' | 'muted'
  width?: number
  height?: number
  className?: string
}): JSX.Element {
  const stroke =
    color === 'accent'
      ? 'rgb(var(--accent))'
      : color === 'ok'
        ? 'rgb(var(--ok))'
        : color === 'danger'
          ? 'rgb(var(--danger))'
          : 'rgb(var(--muted))'

  const w = width
  const h = height
  const mid = h / 2
  const points = `0,${mid} ${w * 0.32},${mid} ${w * 0.42},${mid - h * 0.42} ${w * 0.52},${mid + h * 0.42} ${w * 0.62},${mid} ${w},${mid}`

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={active ? '5 3' : undefined}
        className={active ? 'animate-trace-flow' : undefined}
        opacity={active ? 1 : 0.45}
      />
    </svg>
  )
}
