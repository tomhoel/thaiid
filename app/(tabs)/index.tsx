import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Svg, { Image as SvgImage, Defs, Filter, FeColorMatrix, ClipPath, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useDerivedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import FlippableCard from '../../src/components/FlippableCard';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useTheme } from '../../src/context/ThemeContext';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { CARD_TEMPLATE_BASE64 } from '../../src/constants/cardTemplate';
import { useLang } from '../../src/i18n/LanguageContext';

/* ── Helpers ──────────────────────────────────────────────────── */

const PHOTO_SIZE = 52;

function GrayPhoto({ uri, initials, C }: { uri?: string; initials: string; C: ColorPalette }) {
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
}

function copyValue(val: string) {
  Clipboard.setStringAsync(val);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

const MONTHS: Record<string, number> = {
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
};

function parseDateEn(s: string) {
  const p = s.replace('.', '').split(' ');
  return new Date(Number(p[2]), MONTHS[p[1]] ?? 0, Number(p[0]));
}

function validityStatus(isValid: boolean, expiryEn: string) {
  if (!isValid) return 'expired' as const;
  const diffDays = (parseDateEn(expiryEn).getTime() - Date.now()) / 86_400_000;
  if (diffDays < 0) return 'expired' as const;
  if (diffDays < 180) return 'expiring' as const;
  return 'valid' as const;
}

function computeAge(dobEn: string): number {
  const dob = parseDateEn(dobEn);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}


/* ── Component ────────────────────────────────────────────────── */

export default function HomeScreen() {
  const { lang, t } = useLang();
  const { profile: cardData, updateProfile } = useProfile();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Panel top animates; bottom is always anchored to the tab bar.
  // Expanded top = card top (headerH + cardZone paddingTop 16).
  const cardTopY  = useSharedValue(96);
  const cardBotY  = useSharedValue(320);
  const expansion = useSharedValue(0);
  const startExp  = useSharedValue(0);
  const measured  = useRef({ header: 0, cardZone: 0 });

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
    transform: [{ translateY: translateY.value }],
  }));

  // Only the swipe pill fades out; Garuda divider stays visible as separator
  const pillStyle = useAnimatedStyle(() => ({ opacity: 1 - expansion.value }));
  // Expanded details: fades in, slides up just the pill height
  const detailsStyle = useAnimatedStyle(() => ({
    opacity: expansion.value,
    transform: [{ translateY: -expansion.value * 24 }],
  }));

  // ID number analysis
  const id = cardData.idNumberCompact;

  // Auto-extract face portrait
  useEffect(() => {
    if (cardData.pictureUri) return;
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return;
    const base64 = cardData.cardFrontUri ? cardData.cardFrontUri.split(',')[1] : CARD_TEMPLATE_BASE64;
    const mime = cardData.cardFrontUri ? cardData.cardFrontUri.split(';')[0].split(':')[1] : 'image/png';
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: mime, data: base64 } },
            { text: 'Extract ONLY the portrait photo of the person from this Thai ID card. Return just the face and shoulders cropped tightly, with a plain white background. No card text, borders, or design elements.' },
          ]}],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    )
    .then(r => r.json())
    .then(data => {
      const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (part?.inlineData?.data) {
        updateProfile({ pictureUri: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` });
      }
    })
    .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.screen}>

      {/* ── Header ── */}
      <View onLayout={e => { measured.current.header = e.nativeEvent.layout.height; recalc(); }}>
        <ScreenHeader title={t('header.title')} sub={t('header.sub')} />
      </View>

      {/* ── Card zone ── */}
      <View style={styles.cardZone} onLayout={e => { measured.current.cardZone = e.nativeEvent.layout.height; recalc(); }}>
        <FlippableCard />
        <Text style={styles.flipHint}>{t('card.flipHint')}</Text>
      </View>

      {/* ── Panel — top animates, bottom anchored ── */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.panel, panelStyle]} renderToHardwareTextureAndroid>
          <View style={styles.docPanel}>

            {/* Official header */}
            <View style={styles.docHeader}>
              <Text style={styles.docHeaderTxt}>KINGDOM OF THAILAND</Text>
              <GarudaEmblem size={20} opacity={0.9} />
              <Text style={styles.docHeaderTxt}>ราชอาณาจักรไทย</Text>
            </View>

            {/* ── Default content ── */}

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
              <Ionicons
                name={validityStatus(cardData.isValid, cardData.dateOfExpiry) === 'expired' ? 'close-circle' : 'shield-checkmark'}
                size={22}
                color={
                  validityStatus(cardData.isValid, cardData.dateOfExpiry) === 'valid' ? '#10B981'
                  : validityStatus(cardData.isValid, cardData.dateOfExpiry) === 'expiring' ? '#F59E0B'
                  : '#EF4444'
                }
              />
            </View>

            <View style={styles.rule} />

            {/* ID number */}
            <View style={styles.idRow}>
              <Ionicons name="finger-print" size={13} color={colors.goldLight} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fieldLabel}>{lang === 'en' ? 'PERSONAL NO.' : 'เลขประจำตัว'}</Text>
                <Text style={styles.idNumber}>{cardData.idNumber}</Text>
              </View>
              <Pressable style={styles.copyBtn} onPress={() => copyValue(cardData.idNumber)} accessibilityLabel="Copy ID number">
                <Ionicons name="copy-outline" size={12} color={colors.goldLight} />
              </Pressable>
            </View>

            <View style={styles.rule} />

            {/* DOB + Age */}
            <View style={styles.gridRow}>
              <View style={styles.cell}>
                <View style={styles.cellHead}>
                  <Ionicons name="calendar-outline" size={11} color={colors.t3} />
                  <Text style={styles.fieldLabel}>{lang === 'en' ? 'DATE OF BIRTH' : 'วันเกิด'}</Text>
                </View>
                <Text style={styles.cellValue}>
                  {lang === 'en' ? cardData.dateOfBirth : cardData.dateOfBirthThai}
                </Text>
              </View>
              <View style={styles.vRule} />
              <View style={styles.cell}>
                <View style={styles.cellHead}>
                  <Ionicons name="hourglass-outline" size={11} color={colors.t3} />
                  <Text style={styles.fieldLabel}>{lang === 'en' ? 'AGE' : 'อายุ'}</Text>
                </View>
                <Text style={[styles.cellValue, { fontSize: 18, fontWeight: '800' }]}>
                  {`${computeAge(cardData.dateOfBirth)}`}
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.t3 }}>
                    {lang === 'en' ? ' yrs' : ' ปี'}
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
                  <Text style={styles.fieldLabel}>{lang === 'en' ? 'DATE OF ISSUE' : 'ออกบัตร'}</Text>
                </View>
                <Text style={styles.cellValue}>
                  {lang === 'en' ? cardData.dateOfIssue : cardData.dateOfIssueThai}
                </Text>
              </View>
              <View style={styles.vRule} />
              <View style={styles.cell}>
                <View style={styles.cellHead}>
                  <Ionicons name="time-outline" size={11} color={colors.t3} />
                  <Text style={styles.fieldLabel}>{lang === 'en' ? 'DATE OF EXPIRY' : 'หมดอายุ'}</Text>
                </View>
                <Text style={styles.cellValue}>
                  {lang === 'en' ? cardData.dateOfExpiry : cardData.dateOfExpiryThai}
                </Text>
              </View>
            </View>

            <View style={styles.rule} />

            {/* Address */}
            <View style={styles.fieldRow}>
              <Ionicons name="location-outline" size={13} color={colors.t3} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fieldLabel}>{lang === 'en' ? 'ADDRESS' : 'ที่อยู่'}</Text>
                <Text style={styles.fieldValue} numberOfLines={2}>
                  {lang === 'en'
                    ? `${cardData.addressNumber} Moo ${cardData.moo}, ${cardData.subDistrict}, ${cardData.district}, ${cardData.province}`
                    : cardData.addressThai}
                </Text>
              </View>
            </View>

            {/* Garuda divider — always visible as separator */}
            <View style={styles.expandDivider}>
              <View style={styles.expandLine} />
              <GarudaEmblem size={14} opacity={0.25} />
              <View style={styles.expandLine} />
            </View>

            {/* Swipe pill — fades out on expand */}
            <Animated.View style={[styles.swipeHint, pillStyle]} pointerEvents="none">
              <View style={styles.swipePill} />
            </Animated.View>

            {/* ── Expanded details ── */}
            <Animated.View style={detailsStyle}>

              {/* ── Smart Card ── */}
              <View style={styles.sectionHeader}>
                <Ionicons name="hardware-chip-outline" size={12} color={colors.goldLight} />
                <Text style={styles.sectionTitle}>{lang === 'en' ? 'SMART CARD' : 'สมาร์ทการ์ด'}</Text>
              </View>
              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'CHIP SERIAL' : 'ชิปซีเรียล'}</Text>
                  <Text style={styles.specMono}>THC-4A2B-7F91-E3D0</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'GENERATION' : 'รุ่น'}</Text>
                  <Text style={styles.specValue}>Gen 4 · Smart Card</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'INTERFACE' : 'อินเตอร์เฟส'}</Text>
                  <Text style={styles.specValue}>Contact + RFID</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'STANDARD' : 'มาตรฐาน'}</Text>
                  <Text style={styles.specMono}>ISO/IEC 7816-4</Text>
                </View>
              </View>

              <View style={styles.rule} />

              {/* ── Biometric Data ── */}
              <View style={styles.sectionHeader}>
                <Ionicons name="body-outline" size={12} color={colors.goldLight} />
                <Text style={styles.sectionTitle}>{lang === 'en' ? 'BIOMETRIC DATA' : 'ข้อมูลไบโอเมตริก'}</Text>
              </View>
              <View style={{ gap: 2 }}>
                <View style={styles.bioRow}>
                  <Ionicons name="finger-print" size={14} color={colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{lang === 'en' ? 'FINGERPRINT' : 'ลายนิ้วมือ'}</Text>
                    <Text style={styles.specMono}>a7f2c934...6d3f8e2a</Text>
                  </View>
                  <View style={styles.bioTag}>
                    <Text style={styles.bioTagTxt}>{lang === 'en' ? 'ENROLLED' : 'ลงทะเบียน'}</Text>
                  </View>
                </View>
                <View style={styles.bioRow}>
                  <Ionicons name="scan-outline" size={14} color={colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{lang === 'en' ? 'FACE TEMPLATE' : 'แม่แบบใบหน้า'}</Text>
                    <Text style={styles.specMono}>fc91b2e8...04a7d1c3</Text>
                  </View>
                  <View style={styles.bioTag}>
                    <Text style={styles.bioTagTxt}>{lang === 'en' ? 'ENROLLED' : 'ลงทะเบียน'}</Text>
                  </View>
                </View>
                <View style={styles.bioRow}>
                  <Ionicons name="eye-outline" size={14} color={colors.t4} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{lang === 'en' ? 'IRIS SCAN' : 'สแกนม่านตา'}</Text>
                    <Text style={[styles.specMono, { color: colors.t4 }]}>—</Text>
                  </View>
                  <View style={[styles.bioTag, { borderColor: colors.b2 }]}>
                    <Text style={[styles.bioTagTxt, { color: colors.t4 }]}>{lang === 'en' ? 'N/A' : 'ไม่มี'}</Text>
                  </View>
                </View>
              </View>

              {/* ── Card Specifications ── */}
              <View style={styles.sectionHeader}>
                <Ionicons name="card-outline" size={12} color={colors.goldLight} />
                <Text style={styles.sectionTitle}>{lang === 'en' ? 'CARD SPECIFICATIONS' : 'ข้อมูลจำเพาะบัตร'}</Text>
              </View>
              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'MATERIAL' : 'วัสดุ'}</Text>
                  <Text style={styles.specValue}>Polycarbonate</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'DIMENSIONS' : 'ขนาด'}</Text>
                  <Text style={styles.specMono}>85.6 × 53.98 mm</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'FORMAT' : 'รูปแบบ'}</Text>
                  <Text style={styles.specMono}>ISO/IEC 7810 ID-1</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'en' ? 'SECURITY' : 'ความปลอดภัย'}</Text>
                  <Text style={styles.specValue}>UV + Hologram</Text>
                </View>
              </View>

            </Animated.View>

          </View>
        </Animated.View>
      </GestureDetector>

    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────── */

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  cardZone: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16 },
  flipHint: { fontSize: 11, color: C.t4, marginTop: 8 },

  /* Panel — top animated, bottom anchored to tab bar */
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },

  docPanel: {
    flex: 1, backgroundColor: C.bgCard,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    overflow: 'hidden',
  },

  docHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 10,
  },
  docHeaderTxt: { fontSize: 7.5, fontWeight: '800', color: 'rgba(255,255,255,0.70)', letterSpacing: 1.8 },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  nameValue:   { fontSize: 14, fontWeight: '700', color: C.t1, letterSpacing: 0.2 },
  nameAlt:     { fontSize: 11, color: C.t3, marginTop: 2 },

  idRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  idNumber: { fontSize: 15, color: C.goldLight, letterSpacing: 0.8, fontFamily: 'IBMPlexMono_500Medium' },
  copyBtn: {
    width: 26, height: 26, borderRadius: 5,
    backgroundColor: 'rgba(212,175,55,0.10)', borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  gridRow:   { flexDirection: 'row' },
  cell:      { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  cellHead:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cellValue: { fontSize: 12, fontWeight: '600', color: C.t1 },

  fieldRow:   { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 8.5, fontWeight: '700', color: C.t4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  fieldValue: { fontSize: 11.5, color: C.t1, lineHeight: 16 },

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

  /* Verification footer */
  verifyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  verifyTxt: { fontSize: 10, fontWeight: '600', color: C.t3, letterSpacing: 0.3 },

  rule:  { height: StyleSheet.hairlineWidth, backgroundColor: C.b2 },
  vRule: { width: StyleSheet.hairlineWidth, backgroundColor: C.b2 },
});
