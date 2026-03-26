import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCountry } from '../context/CountryContext';

interface Props {
  size?: number;
  opacity?: number;
}

export default function NationalEmblem({ size = 80, opacity = 1 }: Props) {
  const { colors } = useTheme();
  const { config } = useCountry();
  return (
    <View style={{ width: size, height: size, opacity }}>
      <Image
        source={config.emblemAsset}
        style={{ width: size, height: size, tintColor: colors.goldLight }}
        resizeMode="contain"
      />
    </View>
  );
}
