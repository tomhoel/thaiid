import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export default function USFlag({ width = 60, height = 40 }: Props) {
  const stripeH = height / 13;
  const cantonW = width * 0.4;
  const cantonH = stripeH * 7;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* White background with rounded corners */}
      <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" rx={2} />
      {/* Red stripes */}
      {[0, 2, 4, 6, 8, 10, 12].map(i => (
        <Rect key={i} x={0} y={i * stripeH} width={width} height={stripeH} fill="#B22234" />
      ))}
      {/* Blue canton */}
      <Rect x={0} y={0} width={cantonW} height={cantonH} fill="#3C3B6E" rx={2} />
      {/* Simplified stars as small white dots */}
      {[0.2, 0.5, 0.8].map((cx, ci) =>
        [0.2, 0.5, 0.8].map((cy, ri) => (
          <Rect
            key={`${ci}-${ri}`}
            x={cantonW * cx - 1}
            y={cantonH * cy - 1}
            width={2}
            height={2}
            fill="#FFFFFF"
          />
        ))
      )}
    </Svg>
  );
}
