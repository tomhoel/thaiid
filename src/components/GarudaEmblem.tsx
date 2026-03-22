import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  opacity?: number;
}

export default function GarudaEmblem({ size = 80, color = '#D4AF37', opacity = 1 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <G fill={color}>
        {/* Crown spires */}
        <Path d="M50 2 L47 14 L53 14 Z" />
        <Path d="M42 8 L40 16 L45 14 Z" />
        <Path d="M58 8 L60 16 L55 14 Z" />
        <Path d="M35 12 L34 18 L39 16 Z" />
        <Path d="M65 12 L66 18 L61 16 Z" />

        {/* Head */}
        <Circle cx={50} cy={22} r={7} />

        {/* Beak */}
        <Path d="M50 26 L47 32 L53 32 Z" />

        {/* Upper wings */}
        <Path d="M43 28 C35 24, 18 18, 6 28 C10 30, 20 28, 30 32 C36 34, 40 36, 43 38 Z" />
        <Path d="M57 28 C65 24, 82 18, 94 28 C90 30, 80 28, 70 32 C64 34, 60 36, 57 38 Z" />

        {/* Lower wings */}
        <Path d="M40 42 C32 44, 16 44, 4 52 C10 52, 22 48, 32 48 C36 48, 40 50, 42 52 Z" />
        <Path d="M60 42 C68 44, 84 44, 96 52 C90 52, 78 48, 68 48 C64 48, 60 50, 58 52 Z" />

        {/* Body */}
        <Path d="M44 34 C44 42, 43 52, 44 62 L46 62 L48 56 L50 62 L52 56 L54 62 L56 62 C57 52, 56 42, 56 34 C54 36, 52 37, 50 37 C48 37, 46 36, 44 34 Z" />

        {/* Waist sash */}
        <Path d="M42 58 C42 60, 44 62, 50 62 C56 62, 58 60, 58 58 C56 60, 54 61, 50 61 C46 61, 44 60, 42 58 Z" />

        {/* Legs */}
        <Path d="M46 62 L44 78 L42 82 L40 80 L38 84 L42 84 L46 76 L48 70 Z" />
        <Path d="M54 62 L56 78 L58 82 L60 80 L62 84 L58 84 L54 76 L52 70 Z" />

        {/* Tail feathers */}
        <Path d="M48 68 C48 76, 49 86, 50 94 C51 86, 52 76, 52 68 Z" />
        <Path d="M46 70 C44 80, 44 88, 46 96 C47 88, 48 80, 48 72 Z" />
        <Path d="M54 70 C56 80, 56 88, 54 96 C53 88, 52 80, 52 72 Z" />
      </G>
    </Svg>
  );
}
