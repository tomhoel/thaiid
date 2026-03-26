import React from 'react';
import Svg, { Rect, Circle, G } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export default function SingaporeFlag({ width = 60, height = 40 }: Props) {
  const halfH = height / 2;
  // Crescent + stars scale relative to flag size
  const cx = width * 0.28;
  const cy = height * 0.25;
  const starR = height * 0.04;
  const moonR = height * 0.18;
  const moonInnerR = height * 0.14;

  // Five stars in pentagon formation
  const starCx = width * 0.28;
  const starCy = height * 0.25;
  const spread = height * 0.12;
  const stars = [
    { x: starCx, y: starCy - spread },                         // top
    { x: starCx + spread * 0.95, y: starCy - spread * 0.31 },  // top-right
    { x: starCx + spread * 0.59, y: starCy + spread * 0.81 },  // bottom-right
    { x: starCx - spread * 0.59, y: starCy + spread * 0.81 },  // bottom-left
    { x: starCx - spread * 0.95, y: starCy - spread * 0.31 },  // top-left
  ];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Red top half */}
      <Rect x={0} y={0} width={width} height={halfH} fill="#EE2536" rx={2} />
      {/* White bottom half */}
      <Rect x={0} y={halfH} width={width} height={halfH} fill="#FFFFFF" />
      {/* Round corners overlay */}
      <Rect x={0} y={0} width={width} height={height} fill="none" rx={2} stroke="none" />

      {/* Crescent moon — two overlapping circles */}
      <G>
        <Circle cx={cx - moonR * 0.2} cy={cy} r={moonR} fill="#FFFFFF" />
        <Circle cx={cx + moonR * 0.15} cy={cy} r={moonInnerR} fill="#EE2536" />
      </G>

      {/* Five stars */}
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={starR} fill="#FFFFFF" />
      ))}
    </Svg>
  );
}
