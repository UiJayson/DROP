/**
 * Metallic charcoal surfaces measured from the Vanta Ride reference.
 * Cards are not flat: a radial glow sits on #1D1C21, and a hairline rim
 * reads as metal. The accent for DROP is Keke Yellow, not the reference amber.
 */
export const vanta = {
  page: '#040405',
  pageDeep: '#030305',
  surface: '#1D1C21',
  glow: '#36353B',
  glowSoft: '#2E2D32',
  headerGlow: '#33323A',
  headerSoft: '#2A292F',
  pill: '#37363D',
  pillTop: '#434249',
  text: '#E9E9E9',
  muted: '#9C9C9E',
  dim: '#7F808A',
  faint: '#5B5858',
  yellow: '#FFE14A',
  white: '#FFFFFF',
  metalMid: '#F2F2F2',
  metalEdge: '#9B9B9B',
  ink: '#111111',
  rim: 'rgba(255,255,255,0.08)',
  rimTop: 'rgba(255,255,255,0.14)',
  rimBottom: 'rgba(255,255,255,0.04)',
  rimIcon: 'rgba(255,255,255,0.10)',
  cardRadius: 24,
  sheetRadius: 32,
  icon: 44,
} as const;

export const surfaceGlow = {
  card: { cx: '50%', cy: '100%', inner: vanta.glow, mid: vanta.glowSoft, outer: vanta.surface },
  header: {
    cx: '32%',
    cy: '0%',
    inner: vanta.headerGlow,
    mid: vanta.headerSoft,
    outer: vanta.surface,
  },
} as const;

export const metalCta = [vanta.white, vanta.metalMid, vanta.metalEdge] as const;
export const pillFill = [vanta.pillTop, vanta.pill] as const;
