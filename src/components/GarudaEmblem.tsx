import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface Props {
  size?: number;
  opacity?: number;
}

export default function GarudaEmblem({ size = 80, opacity = 1 }: Props) {
  return (
    <View style={[{ width: size, height: size, opacity }]}>
      <Image
        source={require('../../assets/garuda.png')}
        style={[styles.img, { width: size, height: size, tintColor: '#D4AF37' }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {},
});
