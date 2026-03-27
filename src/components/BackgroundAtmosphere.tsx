import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface Props {
  /** Vertical position of the tint peak, 0–1 (default 0.38 — upper-center, behind card area) */
  tintCenter?: number;
}

/**
 * Country-specific atmospheric background tint.
 * Derives its color from the current accent (goldLight) at low opacity,
 * creating a subtle radial-ish glow that shifts with each country:
 *   Thailand → warm gold    Brazil → emerald green
 *   Singapore → crimson     USA → sapphire blue
 *
 * Place as the first child inside any screen that has `backgroundColor: C.bg`.
 */
const BackgroundAtmosphere = React.memo(function BackgroundAtmosphere({
  tintCenter = 0.38,
}: Props) {
  const { theme, colors } = useTheme();

  const base = colors.goldLight;
  const peak = base + (theme === 'dark' ? '18' : '0F'); // ~9% dark, ~6% light
  const edge = base + '00'; // fully transparent

  return (
    <LinearGradient
      colors={[edge, peak, edge]}
      locations={[0.0, tintCenter, 0.92]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
});

export default BackgroundAtmosphere;
