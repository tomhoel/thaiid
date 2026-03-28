import React, { memo } from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCountry } from '../context/CountryContext';

interface Props {
  size?: number;
  opacity?: number;
}

export default memo(function NationalEmblem({ size = 80, opacity = 1 }: Props) {
  const { colors } = useTheme();
  const { config } = useCountry();
  const useTint = config.emblemTinted !== false;
  return (
    <View style={{ width: size, height: size, opacity }}>
      {useTint ? (
        <Image
          source={config.emblemAsset}
          style={{ width: size, height: size, tintColor: colors.goldLight }}
          resizeMode="contain"
        />
      ) : (
        <Image
          source={config.emblemAsset}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      )}
    </View>
  );
});
