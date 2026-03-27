import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCodeDisplay from '../../src/components/QRCodeDisplay';
import NationalEmblem from '../../src/components/NationalEmblem';
import BackgroundAtmosphere from '../../src/components/BackgroundAtmosphere';
import SingaporeFlag from '../../src/components/SingaporeFlag';
import ThaiFlag from '../../src/components/ThaiFlag';
import BrazilFlag from '../../src/components/BrazilFlag';
import USFlag from '../../src/components/USFlag';
import ScreenHeader from '../../src/components/ScreenHeader';
import LivenessWatermark from '../../src/components/LivenessWatermark';
import { useTheme } from '../../src/context/ThemeContext';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';
import { useCountry } from '../../src/context/CountryContext';

const { width: SW } = Dimensions.get('window');
const REGEN_SECS = 15;
const QR_SIZE = Math.min(SW * 0.48, 220);
const EmblemWatermark = React.memo(({ emblemAsset, tintColor, width, height }: { emblemAsset: any; tintColor: string; width: number; height: number }) => {
  const tile = 50;
  const cols = Math.ceil(width / tile);
  const rows = Math.ceil(height / tile);
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push(
        <Image
          key={`${r}-${c}`}
          source={emblemAsset}
          style={{
            position: 'absolute',
            left: c * tile, top: r * tile,
            width: tile, height: tile,
            tintColor, opacity: 0.04,
          }}
          resizeMode="contain"
        />
      );
    }
  }
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {tiles}
    </View>
  );
});

/* ── Corner brackets — scan target viewfinder ── */
function ScanBrackets({ color }: { color: string }) {
  const L = 18;
  const T = 2.5;
  const R = 4;
  const c = color;
  const offset = -10;
  const base: any = { position: 'absolute', width: L, height: L, borderColor: c };
  return (
    <>
      <View style={[base, { top: offset, left: offset, borderTopWidth: T, borderLeftWidth: T, borderTopLeftRadius: R }]} />
      <View style={[base, { top: offset, right: offset, borderTopWidth: T, borderRightWidth: T, borderTopRightRadius: R }]} />
      <View style={[base, { bottom: offset, left: offset, borderBottomWidth: T, borderLeftWidth: T, borderBottomLeftRadius: R }]} />
      <View style={[base, { bottom: offset, right: offset, borderBottomWidth: T, borderRightWidth: T, borderBottomRightRadius: R }]} />
    </>
  );
}

export default function DigitalScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { bottom } = useSafeAreaInsets();
  const { lang, t } = useLang();
  const { profile: cardData } = useProfile();
  const { config } = useCountry();

  const [timer, setTimer] = useState({ epoch: 0, remaining: REGEN_SECS });

  useEffect(() => {
    const tick = setInterval(() => {
      setTimer(prev => {
        const next = prev.remaining - 1;
        if (next <= 0) return { epoch: prev.epoch + 1, remaining: REGEN_SECS };
        return { ...prev, remaining: next };
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  /* ── Reanimated shared values ── */
  const spinAnim = useSharedValue(0);
  const qrFade = useSharedValue(1);
  const progressAnim = useSharedValue(1);

  useEffect(() => {
    if (timer.epoch > 0) {
      // Spin icon: 0 -> 360deg over 600ms then reset
      spinAnim.value = 0;
      spinAnim.value = withTiming(1, { duration: 600, easing: Easing.linear });
      // QR fade: fade out then back in
      qrFade.value = withSequence(
        withTiming(0, { duration: 200, easing: Easing.linear }),
        withTiming(1, { duration: 400, easing: Easing.linear }),
      );
    }
    // Progress bar: reset to 1 and animate to 0 over the full cycle
    progressAnim.value = 1;
    progressAnim.value = withTiming(0, {
      duration: REGEN_SECS * 1000,
      easing: Easing.linear,
    });
  }, [timer.epoch]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinAnim.value * 360}deg` }],
  }));

  const qrAnimStyle = useAnimatedStyle(() => ({
    opacity: qrFade.value,
    transform: [{ scale: 0.94 + qrFade.value * 0.06 }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  /* ── Entrance animation ── */
  const cardEntrance = useSharedValue(0);
  useEffect(() => {
    cardEntrance.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: cardEntrance.value,
    transform: [
      { translateY: 18 * (1 - cardEntrance.value) },
      { scale: 0.96 + cardEntrance.value * 0.04 },
    ],
  }));

  const secs = timer.remaining.toString().padStart(2, '0');
  const isCritical = timer.remaining <= 3;
  const isWarning = timer.remaining <= 7 && timer.remaining > 3;
  const segColor = isCritical ? C.red : isWarning ? C.orange : C.green;

  const qr = useMemo(() => JSON.stringify({
    type: config.qrType, id: cardData.idNumberCompact,
    name: cardData.fullNameEnglish, expiry: cardData.dateOfExpiry,
    nonce: timer.epoch,
  }), [cardData, timer.epoch]);

  return (
    <View style={[styles.screen, { paddingBottom: bottom }]}>

      <BackgroundAtmosphere tintCenter={0.45} />
      <LivenessWatermark showEmblem={false} />

      <ScreenHeader title={t('digital.title')} sub={t('digital.sub')} />

      <Animated.View style={[styles.content, entranceStyle]}>

        {/* ── QR Card ── */}
        <View style={styles.qrCardWrap}>
          <LinearGradient
            colors={[`${C.goldLight}40`, `${C.goldLight}0D`, `${C.goldLight}26`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.qrCardBorder}
          >
            <View style={styles.qrCard}>

              {/* ── Navy document header ── */}
              <View style={styles.docHeader}>
                <Text style={styles.docHeaderTxt}>{config.name.english}</Text>
                <NationalEmblem size={16} opacity={0.85} />
                <Text style={styles.docHeaderTxt}>{config.name.primary}</Text>
              </View>

              {/* ── Cardholder ── */}
              <View style={styles.holderRow}>
                <View style={styles.avatar}>
                  {cardData.pictureUri ? (
                    <Image source={{ uri: cardData.pictureUri }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {cardData.firstName.charAt(0)}{cardData.lastName.charAt(0)}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.holderName} numberOfLines={1}>
                    {lang === 'en' ? cardData.fullNameEnglish.toUpperCase() : cardData.nameThai}
                  </Text>
                  <Text style={styles.holderSub} numberOfLines={1}>
                    {lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.flagBadge}>
                  {config.code === 'TH' ? <ThaiFlag width={28} height={18} />
                    : config.code === 'SG' ? <SingaporeFlag width={28} height={18} />
                    : config.code === 'BR' ? <BrazilFlag width={28} height={18} />
                    : <USFlag width={28} height={18} />}
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* ── QR zone ── */}
              <View style={styles.qrZone}>
                <EmblemWatermark emblemAsset={config.emblemAsset} tintColor={C.goldLight} width={SW} height={800} />
                <View style={styles.qrGlow} />

                <Animated.View style={qrAnimStyle}>
                  <View style={styles.qrFrame}>
                    <ScanBrackets color={`${C.goldLight}66`} />
                    <View style={styles.qrWhite}>
                      <QRCodeDisplay value={qr} size={QR_SIZE} color={C.navy} />
                    </View>
                  </View>
                </Animated.View>

                <Text style={styles.scanHint}>
                  {t('digital.scanHint')}
                </Text>
              </View>

              <View style={styles.cardDivider} />

              {/* ── ID + Expiry ── */}
              <View style={styles.idRow}>
                <View>
                  <Text style={styles.idLabel}>{t('id.label')}</Text>
                  <Text style={styles.idNumber}>{cardData.idNumber}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.idLabel}>{t('digital.expires')}</Text>
                  <Text style={styles.expiryVal}>
                    {lang === 'en' ? cardData.dateOfExpiry : cardData.dateOfExpiryThai}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* ── Timer — prominent ── */}
              <View style={styles.timerRow}>
                <Animated.View style={spinStyle}>
                  <Ionicons name="sync-outline" size={14} color={segColor} />
                </Animated.View>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, progressBarStyle, {
                    backgroundColor: segColor,
                  }]} />
                </View>
                <Text style={styles.timerLabel}>
                  {t('digital.regen')}
                </Text>
                <Text style={[styles.timerText, { color: segColor }]}>0:{secs}</Text>
              </View>

            </View>
          </LinearGradient>
        </View>

        {/* ── Issuer ── */}
        <View style={styles.issuerLine}>
          <Ionicons name="ribbon-outline" size={10} color={C.t4} />
          <Text style={styles.issuerText}>
            {lang === 'en' ? config.issuer.english : config.issuer.primary}
          </Text>
          <Text style={styles.issuerSep}>·</Text>
          <Text style={styles.issuerText}>
            {lang === 'en' ? config.name.english : config.name.primary}
          </Text>
        </View>

      </Animated.View>

    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },

  qrCardWrap: {
    flex: 1, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 16,
  },
  qrCardBorder: { flex: 1, borderRadius: 16, padding: 1.5 },
  qrCard: { flex: 1, backgroundColor: C.bgCard, borderRadius: 15, overflow: 'hidden' },

  /* Navy header — matches home screen panel */
  docHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 12,
  },
  docHeaderTxt: { fontSize: 7.5, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.6 },

  /* Cardholder */
  holderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
    backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 11, fontWeight: '700', color: C.goldLight },
  flagBadge: { width: 28, height: 18, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)' },
  holderName: { fontSize: 12, fontWeight: '800', color: C.t1, letterSpacing: 0.2 },
  holderSub:  { fontSize: 9, color: C.t4, marginTop: 1 },

  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.b1 },

  /* QR zone */
  qrZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  qrGlow: {
    position: 'absolute', width: QR_SIZE + 100, height: QR_SIZE + 100,
    borderRadius: (QR_SIZE + 100) / 2,
    backgroundColor: C.goldBg,
    borderWidth: 1, borderColor: C.goldBorder,
  },
  qrFrame: { position: 'relative' },
  qrWhite: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },

  scanHint: { fontSize: 11, color: C.t3, fontWeight: '500', marginTop: 14, letterSpacing: 0.3 },

  /* ID + Expiry */
  idRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  idLabel:    { fontSize: 7.5, fontWeight: '700', color: C.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  idNumber:   { fontSize: 13, fontWeight: '800', color: C.goldLight, letterSpacing: 1 },
  expiryVal:  { fontSize: 11, fontWeight: '700', color: C.t2, letterSpacing: 0.5 },

  /* Timer — prominent */
  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.bgSurface,
  },
  timerLabel: {
    fontSize: 7.5, fontWeight: '700', color: C.t4,
    letterSpacing: 0.8,
  },
  timerText: {
    fontSize: 16, fontWeight: '800',
    letterSpacing: -0.3, fontVariant: ['tabular-nums'],
    minWidth: 34, textAlign: 'right',
  },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.b1, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },

  /* Issuer */
  issuerLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingBottom: 4,
  },
  issuerText: { fontSize: 9, color: C.t4, fontWeight: '500' },
  issuerSep:  { fontSize: 9, color: C.t4 },
});
