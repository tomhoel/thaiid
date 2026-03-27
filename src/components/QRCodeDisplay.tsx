import React, { useMemo, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import QRCodeLib from 'qrcode';

interface Props {
  value: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export default memo(function QRCodeDisplay({
  value,
  size = 180,
  color = '#FFFFFF',
  bgColor = 'transparent',
}: Props) {
  const modules = useMemo(() => {
    try {
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
      const data = Array.from(qr.modules.data);
      const moduleCount = qr.modules.size;
      const matrix: boolean[][] = [];
      for (let row = 0; row < moduleCount; row++) {
        const rowData: boolean[] = [];
        for (let col = 0; col < moduleCount; col++) {
          rowData.push(data[row * moduleCount + col] === 1);
        }
        matrix.push(rowData);
      }
      return { matrix, moduleCount };
    } catch {
      return null;
    }
  }, [value]);

  if (!modules) return null;

  const { matrix, moduleCount } = modules;
  const cellSize = size / moduleCount;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {bgColor !== 'transparent' && (
          <Rect x={0} y={0} width={size} height={size} fill={bgColor} />
        )}
        {matrix.map((row, rowIndex) =>
          row.map((cell, colIndex) =>
            cell ? (
              <Rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex * cellSize}
                y={rowIndex * cellSize}
                width={cellSize + 0.5}
                height={cellSize + 0.5}
                fill={color}
              />
            ) : null
          )
        )}
      </Svg>
    </View>
  );
});
