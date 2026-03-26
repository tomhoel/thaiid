import React from 'react';
import Svg, { Rect, Polygon, Circle, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export default function BrazilFlag({ width = 60, height = 40 }: Props) {
  const cx = width / 2;
  const cy = height / 2;
  const dw = width * 0.42;
  const dh = height * 0.40;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Green background */}
      <Rect x={0} y={0} width={width} height={height} fill="#009739" rx={2} />
      {/* Yellow diamond */}
      <Polygon
        points={`${cx},${cy - dh} ${cx + dw},${cy} ${cx},${cy + dh} ${cx - dw},${cy}`}
        fill="#FEDD00"
      />
      {/* Blue globe */}
      <Circle cx={cx} cy={cy} r={height * 0.22} fill="#002776" />
      {/* White band */}
      <Rect x={cx - width * 0.25} y={cy - height * 0.035} width={width * 0.5} height={height * 0.07} fill="#FFFFFF" rx={1} />
    </Svg>
  );
}
