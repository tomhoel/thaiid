// Thai National ID — Design System
// Premium Government · Dark & Light Themes · WCAG AAA

export interface ColorPalette {
  bg: string; bgCard: string; bgElevated: string; bgSurface: string;
  navy: string; navyLight: string; navyMid: string;
  gold: string; goldLight: string; goldBg: string; goldBorder: string;
  blue: string; blueBg: string;
  flagRed: string;
  green: string; greenBg: string; greenBorder: string;
  orange: string; red: string;
  t1: string; t2: string; t3: string; t4: string;
  b1: string; b2: string; divider: string;
  shadow: string;
}

export const DarkColors: ColorPalette = {
  bg: '#0C1526',
  bgCard: '#131E33',
  bgElevated: '#1A2742',
  bgSurface: 'rgba(255,255,255,0.04)',
  navy: '#0C1526',
  navyLight: '#1A2742',
  navyMid: '#162036',
  gold: '#C09520',
  goldLight: '#D4AF37',
  goldBg: 'rgba(212, 175, 55, 0.1)',
  goldBorder: 'rgba(212, 175, 55, 0.18)',
  blue: '#3B82F6',
  blueBg: 'rgba(59, 130, 246, 0.1)',
  flagRed: '#E31E2D',
  green: '#22C55E',
  greenBg: 'rgba(34, 197, 94, 0.1)',
  greenBorder: 'rgba(34, 197, 94, 0.18)',
  orange: '#F59E0B',
  red: '#EF4444',
  t1: '#F1F5F9',
  t2: '#94A3B8',
  t3: '#64748B',
  t4: '#475569',
  b1: 'rgba(255,255,255,0.06)',
  b2: 'rgba(255,255,255,0.1)',
  divider: 'rgba(255,255,255,0.04)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const LightColors: ColorPalette = {
  bg: '#F5F7FA',
  bgCard: '#FFFFFF',
  bgElevated: '#EDF0F5',
  bgSurface: 'rgba(0,0,0,0.03)',
  navy: '#0C1526',
  navyLight: '#1A2742',
  navyMid: '#162036',
  gold: '#B8860B',
  goldLight: '#9A7209',
  goldBg: 'rgba(184, 134, 11, 0.08)',
  goldBorder: 'rgba(184, 134, 11, 0.15)',
  blue: '#2563EB',
  blueBg: 'rgba(37, 99, 235, 0.08)',
  flagRed: '#E31E2D',
  green: '#16A34A',
  greenBg: 'rgba(22, 163, 74, 0.08)',
  greenBorder: 'rgba(22, 163, 74, 0.15)',
  orange: '#D97706',
  red: '#DC2626',
  t1: '#0F172A',
  t2: '#475569',
  t3: '#94A3B8',
  t4: '#CBD5E1',
  b1: 'rgba(0,0,0,0.06)',
  b2: 'rgba(0,0,0,0.1)',
  divider: 'rgba(0,0,0,0.04)',
  shadow: 'rgba(0, 0, 0, 0.08)',
};

// Default export — backward compatible, used by components that haven't migrated to useTheme
export const Colors = DarkColors;
