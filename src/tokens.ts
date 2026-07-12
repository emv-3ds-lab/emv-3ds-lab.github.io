/**
 * Design tokens — single source of truth for all visual constants.
 *
 * Migration guide: any literal in a `style={{}}` or CSS file that is a color,
 * border, radius, or shadow should resolve through one of these tokens. This
 * keeps dark/light theme switching, vendor re-skinning, and design-system
 * migrations greppable and type-safe.
 */

export type Token<T extends string = string> = Readonly<Record<T, string>>;

export const surface = {
  // Top-level surfaces — the canvas and chrome backgrounds
  canvas: 'var(--bg-primary)',
  chrome: 'var(--bg-secondary)',
  elevated: 'var(--bg-tertiary)',
  overlay: 'var(--bg-glass)',
} as const;

export const text = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  inverse: 'var(--text-inverse)',
} as const;

export const border = {
  default: 'var(--border-color)',
  active: 'var(--border-active)',
  strong: 'var(--border-strong)',
  focus: 'var(--accent-secondary)',
} as const;

export const accent = {
  primary: 'var(--accent-primary)',
  secondary: 'var(--accent-secondary)',
} as const;

export const semantic = {
  success: 'var(--color-success)',
  successMuted: 'var(--color-success-muted)',
  warning: 'var(--color-warning)',
  warningMuted: 'var(--color-warning-muted)',
  danger: 'var(--color-danger)',
  dangerMuted: 'var(--color-danger-muted)',
  info: 'var(--color-info)',
  infoMuted: 'var(--color-info-muted)',
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
  pill: 999,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
} as const;

export const shadow = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  glow: (color: string) => `0 0 0 1px ${color}, 0 4px 16px -2px ${color}40`,
} as const;

export const zIndex = {
  background: -1,
  band: 0,
  step: 1,
  rail: 2,
  label: 3,
  panel: 5,
  overlay: 8,
  control: 10,
  modal: 100,
} as const;

export const motion = {
  instant: 0,
  fast: 120,
  base: 180,
  slow: 280,
  packet: (distance: number) => Math.max(800, Math.min(3200, Math.abs(distance) / 0.18)),
} as const;

export const typography = {
  caption: '10.5px',
  body: '12px',
  bodyLg: '13px',
  title: '14px',
  h1: '18px',
  weightBold: 700,
  weightSemi: 600,
  weightReg: 500,
  weightLight: 400,
} as const;
