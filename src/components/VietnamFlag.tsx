import React from 'react';
import Svg, { Rect, Polygon } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export default function VietnamFlag({ width = 60, height = 40 }: Props) {
  // Gold star centered on red background
  const cx = width / 2;
  const cy = height / 2;
  const outer = height * 0.32;
  const inner = outer * 0.4;

  // Five-pointed star vertices
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const oAngle = Math.PI / 2 + i * (2 * Math.PI / 5);
    pts.push(`${cx + outer * Math.cos(oAngle)},${cy - outer * Math.sin(oAngle)}`);
    const iAngle = oAngle + Math.PI / 5;
    pts.push(`${cx + inner * Math.cos(iAngle)},${cy - inner * Math.sin(iAngle)}`);
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill="#DA251D" rx={2} />
      <Polygon points={pts.join(' ')} fill="#FFDA00" />
    </Svg>
  );
}
