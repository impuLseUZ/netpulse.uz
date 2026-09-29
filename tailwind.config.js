/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        term: 'rgb(var(--term-bg) / <alpha-value>)',
        'term-fg': 'rgb(var(--term-fg) / <alpha-value>)',
        knob: 'rgb(var(--knob) / <alpha-value>)'
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        modal: '16px'
      },
      boxShadow: {
        'elevate-1': '0 0 0 1px rgb(var(--border) / 0.6), 0 1px 2px -1px rgb(0 0 0 / 0.24), 0 2px 4px rgb(0 0 0 / 0.12)',
        'elevate-2': '0 0 0 1px rgb(var(--border-strong) / 0.7), 0 4px 10px -2px rgb(0 0 0 / 0.32), 0 8px 20px rgb(0 0 0 / 0.16)',
        'focus-ring': '0 0 0 3px rgb(var(--accent) / 0.25)'
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)'
      },
      keyframes: {
        'trace-flow': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' }
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'trace-flow': 'trace-flow 1.1s linear infinite',
        'pop-in': '150ms cubic-bezier(0.23,1,0.32,1) pop-in'
      }
    }
  },
  plugins: []
}
