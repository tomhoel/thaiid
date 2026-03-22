import React from 'react';
import Svg, { Rect } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export default function ThaiFlag({ width = 60, height = 40 }: Props) {
  const stripeH = height / 6;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill="#ED1C24" rx={2} />
      <Rect x={0} y={stripeH} width={width} height={stripeH * 4} fill="#FFFFFF" />
      <Rect x={0} y={stripeH * 2} width={width} height={stripeH * 2} fill="#241D4F" />
    </Svg>
  );
}
