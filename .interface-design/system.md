# NetPulse design system

## Direction
A network operations workbench (NOC at night), not a SaaS dashboard. Audience:
network/IT engineers reading latency, hops, ports, ARP tables. Accent is an
oscilloscope-trace cyan. Signature element: `PulseTrace` — an animated
waveform line used wherever something is actively live (ping stream, scan,
transfer, SSH session) — literally the "pulse" in NetPulse.

## Tokens (src/renderer/index.css + tailwind.config.js)
- Colors: `bg`, `surface`, `surface-2`, `surface-3`, `border`, `border-strong`,
  `fg`, `muted`, `accent`/`accent-fg`, `ok`, `warn`, `danger`, `term`/`term-fg`
  (terminal stays dark in both themes), `knob` (toggle knob, theme-invariant).
  Light = daylight workbench (deep teal accent on white). Dark = NOC (bright
  cyan `#2ee6c8` accent on near-black).
- Radius scale: `rounded-control` (8px, buttons/inputs/pills), `rounded-card`
  (12px, cards/panels/dropdowns), `rounded-modal` (16px, dialogs).
- Shadows: `shadow-elevate-1`/`shadow-elevate-2` (ring + soft drop, dark-mode
  safe), `shadow-focus-ring` (accent focus ring).
- Motion: `ease-out`/`ease-in-out` custom cubic-beziers, `animate-pop-in`
  (modals), `animate-trace-flow` (PulseTrace).
- Typography: system-ui sans for UI text; `font-mono tabular-nums` is
  mandatory on every data readout (IPs, latency, throughput, ports, hex) —
  this is the "console" layer, applied systematically, not ad hoc.

## Depth strategy
Borders + very subtle shadow-ring elevation (`shadow-elevate-*`), not layered
drop shadows. Inputs are `bg-surface-2` (inset, darker than surroundings).
Dropdowns/modals sit on `surface`/`surface-3` one level above their parent.

## Spacing
4px base grid via Tailwind defaults. Page wrapper: `PageContainer` (24px/`p-8`
padding, `max-w-*` per page). Cards: 12–16px internal padding.

## Shared primitives — src/renderer/components/ui/
`Button` (primary/secondary/danger/ghost × sm/md), `Input` (mono by default),
`Pill`/`PillGroup` (segmented toggles), `Card`, `StatusDot` (tone + optional
pulse), `CopyButton` (unified clipboard pattern), `ProgressBar`, `Toggle`,
`Badge`, `Banner` (info/warn/danger callout, replaces old hand-rolled
hardcoded-color warning boxes), `EmptyState`, `Modal` (full a11y contract:
focus trap, Escape, click-outside, return focus — hand-rolled since no
headless-UI dep is installed), `TableShell`/`Table`/`THead`/`TH`/`TR`/`TD`,
`MetricHero`/`MetricSecondary`/`MetricRow` (hierarchy: one hero reading in
28px/600 tabular-mono + demoted 10px-label secondary tiles — replaces
equal-size metric grids), `PageContainer`/`PageHeader`, `PulseTrace` (the
signature live-indicator).

Reuse these before hand-rolling. `cn()` in `src/renderer/lib/cn.ts` is a
plain classnames joiner (no tailwind-merge dependency — keep call sites
non-contradictory).

## Known deliberate exceptions
- `SftpBrowser.tsx` file-type icon colors (amber/fuchsia/violet/orange) are
  intentionally outside the ok/warn/danger/accent semantic tokens — file-type
  color-coding is a legitimate scanning aid, kept disjoint from status colors
  so a colored file icon is never mistaken for a status.
- `SshTerminal.tsx` xterm theme uses raw hex (xterm requires literal colors,
  can't consume CSS custom properties) — palette is manually derived from the
  token values (cyan cursor = accent, bg = --term-bg) and documented inline.
- Terminal/console surfaces (`bg-term`) stay dark in light mode by design —
  matches every other terminal panel convention (VS Code, iTerm, etc.).
