import React, { memo, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Svg, { Image as SvgImage, Defs, Filter, FeColorMatrix, ClipPath, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useDerivedValue, useAnimatedStyle, withSpring, withDelay, withTiming, Easing, interpolate, Extrapolation } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import FlippableCard from '../../src/components/FlippableCard';
import NationalEmblem from '../../src/components/NationalEmblem';
import LivenessWatermark from '../../src/components/LivenessWatermark';
import ScreenHeader from '../../src/components/ScreenHeader';
import BackgroundAtmosphere from '../../src/components/BackgroundAtmosphere';
import SingaporeFlag from '../../src/components/SingaporeFlag';
import ThaiFlag from '../../src/components/ThaiFlag';
import BrazilFlag from '../../src/components/BrazilFlag';
import USFlag from '../../src/components/USFlag';
import { useTheme } from '../../src/context/ThemeContext';
import { useCountry } from '../../src/context/CountryContext';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';

/* ── Helpers ──────────────────────────────────────────────────── */

const PHOTO_SIZE = 52;

const GrayPhoto = memo(function GrayPhoto({ uri, initials, C }: { uri?: string; initials: string; C: ColorPalette }) {
  const r = PHOTO_SIZE / 2;
  if (uri) {
    return (
      <View style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}>
        <Svg width={PHOTO_SIZE} height={PHOTO_SIZE}>
          <Defs>
            <Filter id="gs"><FeColorMatrix type="saturate" values="0" /></Filter>
            <ClipPath id="cp"><Circle cx={r} cy={r} r={r} /></ClipPath>
          </Defs>
          <SvgImage
            x="0" y="0" width={PHOTO_SIZE} height={PHOTO_SIZE}
            href={uri} clipPath="url(#cp)" filter="url(#gs)"
            preserveAspectRatio="xMidYMid slice"
          />
        </Svg>
        <View style={{ position: 'absolute', width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: r, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)' }} pointerEvents="none" />
      </View>
    );
  }
  return (
    <View style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: r, backgroundColor: C.bgElevated, borderWidth: 1.5, borderColor: C.b2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: C.t3 }}>{initials}</Text>
    </View>
  );
});

const CountryFlagBadge = memo(function CountryFlagBadge({ status }: { status: 'valid' | 'expiring' | 'expired' }) {
  const { config } = useCountry();
  const { colors } = useTheme();
  const dotColor = status === 'valid' ? colors.green : status === 'expiring' ? colors.orange : colors.red;
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: 36, height: 24, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)' }}>
        {config.code === 'TH' ? <ThaiFlag width={36} height={24} />
          : config.code === 'SG' ? <SingaporeFlag width={36} height={24} />
          : config.code === 'BR' ? <BrazilFlag width={36} height={24} />
          : <USFlag width={36} height={24} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {status !== 'valid' && (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
        )}
        <Text style={{ fontSize: 7, fontWeight: '700', color: '#D4AF37', letterSpacing: 0.3 }}>{config.flagLabel}</Text>
      </View>
    </View>
  );
});

function copyValue(val: string) {
  Clipboard.setStringAsync(val);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

const MONTHS: Record<string, number> = {
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
};

function parseDateEn(s: string) {
  const p = s.replace(/\./g, '').split(' ');
  return new Date(Number(p[2]), MONTHS[p[1]] ?? 0, Number(p[0]));
}

function validityStatus(isValid: boolean, expiryEn: string) {
  if (!isValid) return 'expired' as const;
  const diffDays = (parseDateEn(expiryEn).getTime() - Date.now()) / 86_400_000;
  if (diffDays < 0) return 'expired' as const;
  if (diffDays < 180) return 'expiring' as const;
  return 'valid' as const;
}

function computeAge(dobEn: string): number | string {
  const dob = parseDateEn(dobEn);
  if (isNaN(dob.getTime())) return '--';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}


/* ── Component ────────────────────────────────────────────────── */

export default function HomeScreen() {
  const { lang, t } = useLang();
  const { config } = useCountry();
  const { profile: cardData, updateProfile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Panel top animates; bottom is always anchored to the tab bar.
  // Expanded top = card top (headerH + cardZone paddingTop 16).
  const cardTopY  = useSharedValue(96);
  const cardBotY  = useSharedValue(320);
  const expansion = useSharedValue(0);
  const startExp  = useSharedValue(0);
  const measured  = useRef({ header: 0, cardZone: 0 });

  /* ── Entrance animations (GPU-composited, UI thread) ── */
  const headerEnter = useSharedValue(0);
  const cardEnter = useSharedValue(0);
  const panelEnter = useSharedValue(0);
  const rowReveal = useSharedValue(0);

  useEffect(() => {
    headerEnter.value = withDelay(50, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    cardEnter.value = withDelay(200, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    panelEnter.value = withDelay(480, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    rowReveal.value = withDelay(580, withTiming(4, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const headerEnterStyle = useAnimatedStyle(() => ({
    opacity: headerEnter.value,
    transform: [{ translateY: interpolate(headerEnter.value, [0, 1], [-10, 0]) }],
  }));

  const cardEnterStyle = useAnimatedStyle(() => ({
    opacity: cardEnter.value,
    transform: [
      { scale: interpolate(cardEnter.value, [0, 1], [0.88, 1]) },
      { translateY: interpolate(cardEnter.value, [0, 1], [-16, 0]) },
    ],
  }));

  const r0 = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, rowReveal.value));
    return { opacity: p, transform: [{ translateY: (1 - p) * 12 }] };
  });
  const r1 = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, rowReveal.value - 1.3));
    return { opacity: p, transform: [{ translateY: (1 - p) * 12 }] };
  });
  const r2 = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, rowReveal.value - 2.6));
    return { opacity: p, transform: [{ translateY: (1 - p) * 12 }] };
  });

  function recalc() {
    const { header: h, cardZone: cz } = measured.current;
    if (h <= 0 || cz <= 0) return;
    cardTopY.value = h + 16; // align with top of the flippable card
    cardBotY.value = h + cz;
  }

  // Pre-compute drag range so worklets don't recompute per frame
  const dragRange = useDerivedValue(() => cardBotY.value - cardTopY.value);
  const translateY = useDerivedValue(() => -expansion.value * dragRange.value);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-3, 3])
    .minPointers(1)
    .maxPointers(1)
    .onBegin(() => { 'worklet'; startExp.value = expansion.value; })
    .onUpdate(e => {
      'worklet';
      const r = dragRange.value;
      if (r <= 0) return;
      expansion.value = Math.min(Math.max(startExp.value - e.translationY / r, 0), 1);
    })
    .onEnd(e => {
      'worklet';
      const snap = (expansion.value > 0.4 || e.velocityY < -400) ? 1 : 0;
      expansion.value = withSpring(snap, { damping: 28, stiffness: 340, overshootClamping: true });
    });

  // Panel: layout props (top/bottom) are static during animation;
  // only translateY changes → pure GPU composite, zero layout passes.
  const panelStyle = useAnimatedStyle(() => ({
    top: cardBotY.value,
    bottom: -dragRange.value,
    transform: [{ translateY: translateY.value + (1 - panelEnter.value) * 40 }],
    opacity: interpolate(panelEnter.value, [0, 0.15], [0, 1], Extrapolation.CLAMP),
  }));

  // Only the swipe pill fades out; Garuda divider stays visible as separator
  const pillStyle = useAnimatedStyle(() => ({ opacity: 1 - expansion.value }));
  // Expanded details: fades in, slides up just the pill height
  const detailsStyle = useAnimatedStyle(() => ({
    opacity: expansion.value,
    transform: [{ translateY: -expansion.value * 24 }],
  }));


  const status = useMemo(() => validityStatus(cardData.isValid, cardData.dateOfExpiry), [cardData.isValid, cardData.dateOfExpiry]);
  const age = useMemo(() => computeAge(cardData.dateOfBirth), [cardData.dateOfBirth]);

  return (
    <View style={styles.screen}>

      <BackgroundAtmosphere />
      <LivenessWatermark />

      {/* ── Header ── */}
      <Animated.View style={headerEnterStyle} onLayout={e => { measured.current.header = e.nativeEvent.layout.height; recalc(); }}>
        <ScreenHeader title={t('header.title')} sub={t('header.sub')} />
      </Animated.View>

      {/* ── Card zone ── */}
      <View style={styles.cardZone} onLayout={e => { measured.current.cardZone = e.nativeEvent.layout.height; recalc(); }}>
        <Animated.View style={cardEnterStyle}>
          <FlippableCard />
          <Text style={styles.flipHint}>{t('card.flipHint')}</Text>
        </Animated.View>
      </View>

      {/* ── Panel — top animates, bottom anchored ── */}
        <Animated.View style={[styles.panel, panelStyle]} renderToHardwareTextureAndroid>
          <View style={styles.docPanel}>

            {/* ═══ Sticky header — gesture target for expand/collapse ═══ */}
            <GestureDetector gesture={panGesture}>
              <Animated.View>

              {/* Official header */}
              <View style={styles.docHeader}>
                <Text style={styles.docHeaderTxt}>{config.name.english}</Text>
                <NationalEmblem size={20} opacity={0.9} />
                <Text style={styles.docHeaderTxt}>{config.name.primary}</Text>
              </View>

              <Animated.View style={r0}>
              {/* Identity */}
              <View style={styles.identityRow}>
                <GrayPhoto
                  uri={cardData.pictureUri}
                  initials={`${cardData.firstName.charAt(0)}${cardData.lastName.charAt(0)}`}
                  C={colors}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nameValue} numberOfLines={1} adjustsFontSizeToFit>
                    {lang === 'en'
                      ? `${cardData.firstName.toUpperCase()}  ${cardData.lastName.toUpperCase()}`
                      : cardData.nameThai}
                  </Text>
                  <Text style={styles.nameAlt}>
                    {lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish}
                  </Text>
                </View>
                <CountryFlagBadge status={status} />
              </View>

              <View style={styles.rule} />

              {/* ID number */}
              <View style={styles.idRow}>
                <Ionicons name="finger-print" size={13} color={colors.goldLight} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.fieldLabel}>{t('id.personalNo')}</Text>
                  <Text style={styles.idNumber}>{cardData.idNumber}</Text>
                </View>
                <Pressable style={styles.copyBtn} onPress={() => copyValue(cardData.idNumber)} accessibilityLabel="Copy ID number">
                  <Ionicons name="copy-outline" size={12} color={colors.goldLight} />
                </Pressable>
              </View>
              <View style={styles.rule} />
              </Animated.View>

              <Animated.View style={r1}>
              {/* DOB + Age */}
              <View style={styles.gridRow}>
                <View style={styles.cell}>
                  <View style={styles.cellHead}>
                    <Ionicons name="calendar-outline" size={11} color={colors.t3} />
                    <Text style={styles.fieldLabel}>{t('info.dob')}</Text>
                  </View>
                  <Text style={styles.cellValue}>
                    {lang === 'en' ? cardData.dateOfBirth : cardData.dateOfBirthThai}
                  </Text>
                </View>
                <View style={styles.vRule} />
                <View style={styles.cell}>
                  <View style={styles.cellHead}>
                    <Ionicons name="hourglass-outline" size={11} color={colors.t3} />
                    <Text style={styles.fieldLabel}>{t('info.age')}</Text>
                  </View>
                  <Text style={styles.cellValue}>
                    {`${age}`}
                    <Text style={{ fontSize: 10, color: colors.t3 }}>
                      {t('info.ageUnit')}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.rule} />

              {/* Issue + Expiry */}
              <View style={styles.gridRow}>
                <View style={styles.cell}>
                  <View style={styles.cellHead}>
                    <Ionicons name="ribbon-outline" size={11} color={colors.t3} />
                    <Text style={styles.fieldLabel}>{t('info.issued')}</Text>
                  </View>
                  <Text style={styles.cellValue}>
                    {lang === 'en' ? cardData.dateOfIssue : cardData.dateOfIssueThai}
                  </Text>
                </View>
                <View style={styles.vRule} />
                <View style={styles.cell}>
                  <View style={styles.cellHead}>
                    <Ionicons name="time-outline" size={11} color={colors.t3} />
                    <Text style={styles.fieldLabel}>{t('info.expires')}</Text>
                  </View>
                  <Text style={styles.cellValue}>
                    {lang === 'en' ? cardData.dateOfExpiry : cardData.dateOfExpiryThai}
                  </Text>
                </View>
              </View>
              <View style={styles.rule} />
              </Animated.View>

              <Animated.View style={r2}>
              {/* Address */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={styles.cellHead}>
                  <Ionicons name="location-outline" size={11} color={colors.t3} />
                  <Text style={styles.fieldLabel}>{t('info.address')}</Text>
                </View>
                <Text style={[styles.cellValue, { lineHeight: 16 }]} numberOfLines={2}>
                  {config.addressFormatter(cardData, lang)}
                </Text>
              </View>
              </Animated.View>

              {/* Garuda divider + swipe pill */}
              <View style={styles.expandDivider}>
                <View style={styles.expandLine} />
                <NationalEmblem size={14} opacity={0.25} />
                <View style={styles.expandLine} />
              </View>

              <Animated.View style={[styles.swipeHint, pillStyle]} pointerEvents="none">
                <View style={styles.swipePill} />
              </Animated.View>

            {/* ── Expanded details ── */}
            <Animated.View style={detailsStyle}>

              {/* ── Smart Card ── */}
              <View style={styles.sectionHeader}>
                <Ionicons name="hardware-chip-outline" size={12} color={colors.goldLight} />
                <Text style={styles.sectionTitle}>{t('expanded.smartCard')}</Text>
              </View>
              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('expanded.chipSerial')}</Text>
                  <Text style={styles.specMono}>{config.chipSerial}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('expanded.generation')}</Text>
                  <Text style={styles.specValue}>{t('expanded.genValue')}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('expanded.interface')}</Text>
                  <Text style={styles.specValue}>{t('expanded.interfaceValue')}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('expanded.standard')}</Text>
                  <Text style={styles.specMono}>ISO/IEC 7816-4</Text>
                </View>
              </View>

              <View style={styles.rule} />

              {/* ── Biometric Data ── */}
              <View style={styles.sectionHeader}>
                <Ionicons name="body-outline" size={12} color={colors.goldLight} />
                <Text style={styles.sectionTitle}>{t('expanded.biometric')}</Text>
              </View>
              <View style={{ gap: 2 }}>
                <View style={styles.bioRow}>
                  <Ionicons name="finger-print" size={14} color={colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{t('expanded.fingerprint')}</Text>
                    <Text style={styles.specMono}>a7f2c934...6d3f8e2a</Text>
                  </View>
                  <View style={styles.bioTag}>
                    <Text style={styles.bioTagTxt}>{t('expanded.enrolled')}</Text>
                  </View>
                </View>
                <View style={styles.bioRow}>
                  <Ionicons name="scan-outline" size={14} color={colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{t('expanded.faceTemplate')}</Text>
                    <Text style={styles.specMono}>fc91b2e8...04a7d1c3</Text>
                  </View>
                  <View style={styles.bioTag}>
                    <Text style={styles.bioTagTxt}>{t('expanded.enrolled')}</Text>
                  </View>
                </View>
                <View style={styles.bioRow}>
                  <Ionicons name="eye-outline" size={14} color={colors.t4} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{t('expanded.irisScan')}</Text>
                    <Text style={[styles.specMono, { color: colors.t4 }]}>—</Text>
                  </View>
                  <View style={[styles.bioTag, { borderColor: colors.b2 }]}>
                    <Text style={[styles.bioTagTxt, { color: colors.t4 }]}>{t('expanded.na')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rule} />

              {/* Card Details link */}
              <Pressable
                style={styles.cardDetailsBtn}
                onPress={() => router.push('/details')}
              >
                <Ionicons name="document-text-outline" size={14} color={colors.goldLight} />
                <Text style={styles.cardDetailsBtnTxt}>{t('details.cardDetails')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.t4} style={{ marginLeft: 'auto' }} />
              </Pressable>

            </Animated.View>

            </Animated.View>
            </GestureDetector>

          </View>
        </Animated.View>

    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────── */

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  cardZone: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16 },
  flipHint: { fontSize: 11, color: C.t4, marginTop: 8, textAlign: 'center' },

  /* Panel — top animated, bottom anchored to tab bar */
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, backgroundColor: 'transparent' },

  docPanel: {
    flex: 1, backgroundColor: C.bgCard,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.navy,
    borderTopWidth: 1, borderTopColor: C.goldLight + '25',
    borderBottomWidth: 0,
  },

  docHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 16,
  },
  docHeaderTxt: { fontSize: 8.5, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.8 },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  nameValue:   { fontSize: 14, fontWeight: '700', color: C.t1, letterSpacing: 0.2 },
  nameAlt:     { fontSize: 11, color: C.t3, marginTop: 2 },

  idRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  idNumber: { fontSize: 15, color: C.goldLight, letterSpacing: 0.8, fontFamily: 'IBMPlexMono_500Medium' },
  copyBtn: {
    width: 26, height: 26, borderRadius: 5,
    backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  gridRow:   { flexDirection: 'row' },
  cell:      { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  cellHead:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cellValue: { fontSize: 12, fontWeight: '600', color: C.t1 },

  fieldLabel: { fontSize: 8.5, fontWeight: '700', color: C.t4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },

  /* Garuda divider */
  expandDivider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  expandLine:    { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.goldBorder },

  /* Swipe indicator */
  swipeHint: { alignItems: 'center', paddingVertical: 10 },
  swipePill:  { width: 32, height: 3, borderRadius: 1.5, backgroundColor: C.b2 },

  /* Expanded — section headers */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  sectionTitle:  { fontSize: 9, fontWeight: '700', color: C.goldLight, letterSpacing: 1.2 },

  /* Spec grid (2-col wrap) */
  specGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10 },
  specItem:  { width: '50%', paddingVertical: 6 },
  specLabel: { fontSize: 7.5, fontWeight: '700', color: C.t4, letterSpacing: 0.8, marginBottom: 2 },
  specValue: { fontSize: 11, fontWeight: '600', color: C.t2 },
  specMono:  { fontSize: 10, fontWeight: '600', color: C.t2, fontFamily: 'IBMPlexMono_500Medium', letterSpacing: 0.4 },

  /* Biometric rows */
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  bioTag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
    borderWidth: 1, borderColor: C.greenBorder,
  },
  bioTagTxt: { fontSize: 7, fontWeight: '800', color: C.green, letterSpacing: 0.6 },

  rule:  { height: StyleSheet.hairlineWidth, backgroundColor: C.b2 },
  vRule: { width: StyleSheet.hairlineWidth, backgroundColor: C.b2 },

  /* Card Details link */
  cardDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardDetailsBtnTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: C.goldLight,
    letterSpacing: 0.4,
  },
});
