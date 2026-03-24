import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Animated, StyleSheet, View, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Image as SvgImage, Rect } from 'react-native-svg';
import QRCodeDisplay from '../../src/components/QRCodeDisplay';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useTheme } from '../../src/context/ThemeContext';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';

const { width: SW } = Dimensions.get('window');
const REGEN_SECS = 60;
const QR_SIZE = Math.min(SW * 0.52, 240);
const garudaAsset = require('../../assets/garuda.png');

const GarudaWatermark = React.memo(function GarudaWatermark({ width, height }: { width: number; height: number }) {
  const tile = 55;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="gw" width={tile} height={tile} patternUnits="userSpaceOnUse">
            <SvgImage href={garudaAsset} width={tile} height={tile} opacity={0.035} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#gw)" />
      </Svg>
    </View>
  );
});

export default function DigitalScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { bottom } = useSafeAreaInsets();
  const { lang, t } = useLang();
  const { profile: cardData } = useProfile();

  const [remaining, setRemaining] = useState(REGEN_SECS);
  const [epoch, setEpoch] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRemaining(REGEN_SECS);
      const tick = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) { setEpoch(e => e + 1); return REGEN_SECS; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(tick);
    }, [])
  );

  const spinAnim = useRef(new Animated.Value(0)).current;
  const qrFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (epoch > 0) {
      Animated.timing(spinAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start(() => spinAnim.setValue(0));
      Animated.sequence([
        Animated.timing(qrFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(qrFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [epoch]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const qrScale = qrFade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const secs = remaining.toString().padStart(2, '0');
  const isCritical = remaining <= 10;
  const isWarning = remaining <= 25 && remaining > 10;
  const segColor = isCritical ? C.red : isWarning ? C.orange : C.green;
  const progress = remaining / REGEN_SECS;

  const qr = useMemo(() => JSON.stringify({
    type: 'THAI_NATIONAL_ID', id: cardData.idNumberCompact,
    name: cardData.fullNameEnglish, expiry: cardData.dateOfExpiry,
    nonce: epoch,
  }), [cardData, epoch]);

  return (
    <View style={[styles.screen, { paddingBottom: bottom }]}>

      <ScreenHeader title={t('digital.title')} sub={t('digital.sub')} />

      <View style={styles.content}>

        {/* ── QR Card ── */}
        <View style={styles.qrCardWrap}>
          <LinearGradient
            colors={['rgba(212,175,55,0.25)', 'rgba(212,175,55,0.05)', 'rgba(212,175,55,0.15)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.qrCardBorder}
          >
            <View style={styles.qrCard}>

              {/* Cardholder */}
              <View style={styles.holderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {cardData.firstName.charAt(0)}{cardData.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.holderName} numberOfLines={1}>
                    {lang === 'en' ? cardData.fullNameEnglish.toUpperCase() : cardData.nameThai}
                  </Text>
                  <Text style={styles.holderSub} numberOfLines={1}>
                    {lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish.toUpperCase()}
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={20} color={C.green} />
              </View>

              <View style={styles.cardDivider} />

              {/* QR zone */}
              <View style={styles.qrZone}>
                <GarudaWatermark width={SW - 36} height={QR_SIZE + 120} />
                <View style={styles.qrGlow} />

                <Animated.View style={{ opacity: qrFade, transform: [{ scale: qrScale }] }}>
                  <View style={styles.qrWhite}>
                    <QRCodeDisplay value={qr} size={QR_SIZE} color={C.navy} />
                  </View>
                </Animated.View>

                <Text style={styles.scanHint}>
                  {lang === 'en' ? 'Scan to verify identity' : 'สแกนเพื่อยืนยันตัวตน'}
                </Text>
              </View>

              <View style={styles.cardDivider} />

              {/* ID + Expiry */}
              <View style={styles.idRow}>
                <View>
                  <Text style={styles.idLabel}>{t('id.label')}</Text>
                  <Text style={styles.idNumber}>{cardData.idNumber}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.idLabel}>{lang === 'en' ? 'EXPIRES' : 'หมดอายุ'}</Text>
                  <Text style={styles.expiryVal}>{cardData.dateOfExpiry}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Timer */}
              <View style={styles.timerRow}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync-outline" size={12} color={segColor} />
                </Animated.View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: segColor }]} />
                </View>
                <Text style={[styles.timerText, { color: segColor }]}>0:{secs}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Issuer */}
        <View style={styles.issuerLine}>
          <Ionicons name="ribbon-outline" size={10} color={C.t4} />
          <Text style={styles.issuerText}>
            {lang === 'en' ? 'Dept. of Provincial Administration' : 'กรมการปกครอง'}
          </Text>
          <Text style={styles.issuerSep}>·</Text>
          <Text style={styles.issuerText}>
            {lang === 'en' ? 'Kingdom of Thailand' : 'ราชอาณาจักรไทย'}
          </Text>
        </View>

      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },

  qrCardWrap: {
    flex: 1, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 16,
  },
  qrCardBorder: { flex: 1, borderRadius: 20, padding: 1.5 },
  qrCard: { flex: 1, backgroundColor: C.bgCard, borderRadius: 19, overflow: 'hidden' },

  holderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: C.goldLight },
  holderName: { fontSize: 13, fontWeight: '800', color: C.t1, letterSpacing: 0.2 },
  holderSub:  { fontSize: 10, color: C.t4, marginTop: 1 },

  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.b1 },

  qrZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  qrGlow: {
    position: 'absolute', width: QR_SIZE + 100, height: QR_SIZE + 100,
    borderRadius: (QR_SIZE + 100) / 2,
    backgroundColor: 'rgba(212,175,55,0.04)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.06)',
  },
  qrWhite: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },

  scanHint: { fontSize: 11, color: C.t3, fontWeight: '500', marginTop: 16, letterSpacing: 0.3 },

  idRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  idLabel:    { fontSize: 8, fontWeight: '700', color: C.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  idNumber:   { fontSize: 14, fontWeight: '800', color: C.goldLight, letterSpacing: 1 },
  expiryVal:  { fontSize: 12, fontWeight: '700', color: C.t2, letterSpacing: 0.5 },

  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  timerText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  progressTrack: { flex: 1, height: 3, backgroundColor: C.b1, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 3, borderRadius: 2 },

  issuerLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingBottom: 4,
  },
  issuerText: { fontSize: 9, color: C.t4, fontWeight: '500' },
  issuerSep:  { fontSize: 9, color: C.t4 },
});
