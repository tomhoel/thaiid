import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Image as SvgImage, Rect } from 'react-native-svg';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import QRCodeDisplay from '../../src/components/QRCodeDisplay';
import { Colors } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';

const { width: SW } = Dimensions.get('window');
const REGEN_SECS = 60;
const QR_SIZE = Math.min(SW * 0.52, 240);
const garudaAsset = require('../../assets/garuda.png');

// ── Garuda watermark tiled pattern ──
function GarudaWatermark({ width, height }: { width: number; height: number }) {
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
}

// ── Certificate chain visual ──
function CertChain({ lang }: { lang: string }) {
  const nodes = [
    { icon: 'phone-portrait' as const, label: lang === 'en' ? 'Device' : 'อุปกรณ์', color: Colors.green },
    { icon: 'shield-checkmark' as const, label: 'ThaID', color: Colors.goldLight },
    { icon: 'business' as const, label: 'DOPA', color: Colors.blue },
  ];
  return (
    <View style={styles.certChain}>
      <Text style={styles.certTitle}>{lang === 'en' ? 'TRUST PATH' : 'เส้นทางความน่าเชื่อถือ'}</Text>
      <View style={styles.certRow}>
        {nodes.map((n, i) => (
          <React.Fragment key={n.label}>
            <View style={styles.certNode}>
              <View style={[styles.certIcon, { borderColor: n.color + '40' }]}>
                <Ionicons name={n.icon} size={10} color={n.color} />
              </View>
              <Text style={[styles.certLabel, { color: n.color }]}>{n.label}</Text>
            </View>
            {i < nodes.length - 1 && (
              <View style={styles.certArrow}>
                <View style={styles.certLine} />
                <Ionicons name="chevron-forward" size={8} color={Colors.t4} />
                <View style={styles.certLine} />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export default function DigitalScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { lang, toggle, t } = useLang();
  const { profile: cardData } = useProfile();

  const [remaining, setRemaining] = useState(REGEN_SECS);
  const [colonVisible, setColonVisible] = useState(true);
  const [epoch, setEpoch] = useState(0); // increments on each regen

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setEpoch(e => e + 1);
          return REGEN_SECS;
        }
        return prev - 1;
      });
    }, 1000);
    const blink = setInterval(() => setColonVisible(v => !v), 500);
    return () => { clearInterval(tick); clearInterval(blink); };
  }, []);

  // Spin icon on regen
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const qrFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (epoch > 0) {
      // Spin the refresh icon
      Animated.timing(spinAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start(() => spinAnim.setValue(0));

      // Animated QR regen: fade out → swap → fade in + scale
      Animated.sequence([
        Animated.timing(qrFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(qrFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [epoch]);

  // Subtle pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.01, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const qrScale = qrFade.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const secs = remaining.toString().padStart(2, '0');
  const isCritical = remaining <= 10;
  const isWarning = remaining <= 25 && remaining > 10;
  const segColor = isCritical ? Colors.red : isWarning ? Colors.orange : Colors.green;
  const progress = remaining / REGEN_SECS;

  // QR payload includes epoch so it actually changes
  const qr = useMemo(() => JSON.stringify({
    type: 'THAI_NATIONAL_ID', id: cardData.idNumberCompact,
    name: cardData.fullNameEnglish, expiry: cardData.dateOfExpiry,
    nonce: epoch,
  }), [cardData, epoch]);

  return (
    <View style={[styles.screen, { paddingTop: top + 8, paddingBottom: bottom }]}>

      {/* ── Header ── */}
      <View style={styles.headerBanner}>
        <View style={styles.headerLeft}>
          <GarudaEmblem size={32} />
          <View>
            <Text style={styles.headerTitle}>{t('digital.title')}</Text>
            <Text style={styles.headerSub}>{t('digital.sub')}</Text>
          </View>
        </View>
        <Pressable style={styles.langSwitch} onPress={toggle}>
          <Text style={[styles.langLabel, lang === 'en' && styles.langActive]}>EN</Text>
          <View style={styles.langDot} />
          <Text style={[styles.langLabel, lang === 'th' && styles.langActive]}>TH</Text>
        </Pressable>
      </View>

      {/* ── QR Card ── */}
      <View style={styles.qrCardWrap}>
        <LinearGradient
          colors={['rgba(212,175,55,0.25)', 'rgba(212,175,55,0.05)', 'rgba(212,175,55,0.15)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.qrCardBorder}
        >
          <View style={styles.qrCard}>
            {/* Cardholder strip */}
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
              <View style={styles.validBadge}>
                <View style={styles.validDot} />
                <Text style={styles.validText}>{lang === 'en' ? 'Verified' : 'ยืนยันแล้ว'}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* QR zone with watermark */}
            <View style={styles.qrZone}>
              <GarudaWatermark width={SW - 36} height={QR_SIZE + 120} />
              <View style={styles.qrGlow} />

              <Animated.View style={[styles.qrOuter, {
                transform: [{ scale: pulseAnim }],
                opacity: qrFade,
              }]}>
                <Animated.View style={{ transform: [{ scale: qrScale }] }}>
                  <View style={[styles.corner, styles.cTL]} />
                  <View style={[styles.corner, styles.cTR]} />
                  <View style={[styles.corner, styles.cBL]} />
                  <View style={[styles.corner, styles.cBR]} />
                  <View style={styles.qrWhite}>
                    <QRCodeDisplay value={qr} size={QR_SIZE} color={Colors.navy} />
                  </View>
                </Animated.View>
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
          </View>
        </LinearGradient>
      </View>

      {/* ── Token + Security + Cert Chain ── */}
      <View style={[styles.tokenCard, isCritical && styles.tokenCardCritical]}>
        <View style={styles.tokenInner}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync-outline" size={13} color={segColor} />
          </Animated.View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: segColor }]} />
          </View>
          <Text style={[styles.tokenTime, { color: segColor }]}>
            0{!colonVisible ? ' ' : ':'}{secs}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: segColor + '18', borderColor: segColor + '30' }]}>
            <View style={[styles.statusDot, { backgroundColor: segColor }]} />
            <Text style={[styles.statusText, { color: segColor }]}>
              {isCritical ? (lang === 'en' ? 'EXPIRING' : 'หมดอายุ') : (lang === 'en' ? 'ACTIVE' : 'ใช้งาน')}
            </Text>
          </View>
        </View>

        <View style={styles.secDivider} />

        <View style={styles.secStrip}>
          <View style={styles.secItem}>
            <Ionicons name="shield-checkmark" size={10} color={Colors.goldLight} />
            <Text style={styles.secVal}>E2E</Text>
          </View>
          <View style={styles.secSep} />
          <View style={styles.secItem}>
            <Ionicons name="lock-closed" size={10} color={Colors.goldLight} />
            <Text style={styles.secVal}>AES-256</Text>
          </View>
          <View style={styles.secSep} />
          <View style={styles.secItem}>
            <Ionicons name="finger-print" size={10} color={Colors.goldLight} />
            <Text style={styles.secVal}>ThaID</Text>
          </View>
          <View style={styles.secSep} />
          <View style={styles.secItem}>
            <Ionicons name="code-slash" size={10} color={Colors.goldLight} />
            <Text style={styles.secVal}>SHA-256</Text>
          </View>
        </View>

        <View style={styles.secDivider} />
        <CertChain lang={lang} />
      </View>

      {/* ── Issuer footnote ── */}
      <View style={styles.issuerLine}>
        <Ionicons name="ribbon-outline" size={10} color={Colors.t4} />
        <Text style={styles.issuerText}>
          {lang === 'en' ? 'Dept. of Provincial Administration' : 'กรมการปกครอง'}
        </Text>
        <Text style={styles.issuerSep}>·</Text>
        <Text style={styles.issuerText}>
          {lang === 'en' ? 'Kingdom of Thailand' : 'ราชอาณาจักรไทย'}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 16 },

  headerBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: -16, marginBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.b1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.t1, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, color: Colors.t4, marginTop: 1 },
  langSwitch: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.bgElevated, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.b2,
  },
  langLabel: { fontSize: 12, fontWeight: '700', color: Colors.t4 },
  langActive: { color: Colors.goldLight },
  langDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.t4 },

  qrCardWrap: {
    flex: 1, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 16,
  },
  qrCardBorder: { flex: 1, borderRadius: 20, padding: 1.5 },
  qrCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 19, overflow: 'hidden' },

  holderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: Colors.goldLight },
  holderName: { fontSize: 13, fontWeight: '800', color: Colors.t1, letterSpacing: 0.2 },
  holderSub: { fontSize: 10, color: Colors.t4, marginTop: 1 },
  validBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.greenBg, paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.greenBorder,
  },
  validDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.green },
  validText: { fontSize: 10, fontWeight: '700', color: Colors.green },

  cardDivider: { height: 1, backgroundColor: Colors.b1 },

  qrZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  qrGlow: {
    position: 'absolute', width: QR_SIZE + 100, height: QR_SIZE + 100,
    borderRadius: (QR_SIZE + 100) / 2,
    backgroundColor: 'rgba(212,175,55,0.04)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.06)',
  },
  qrOuter: { padding: 18 },
  qrWhite: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },

  corner: { position: 'absolute', width: 20, height: 20, borderColor: Colors.goldLight },
  cTL: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 5 },
  cTR: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 5 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 5 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 5 },

  scanHint: { fontSize: 11, color: Colors.t3, fontWeight: '500', marginTop: 14, letterSpacing: 0.3 },

  idRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  idLabel: { fontSize: 8, fontWeight: '700', color: Colors.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  idNumber: { fontSize: 14, fontWeight: '800', color: Colors.goldLight, letterSpacing: 1 },
  expiryVal: { fontSize: 12, fontWeight: '700', color: Colors.t2, letterSpacing: 0.5 },

  tokenCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.b1, overflow: 'hidden', marginBottom: 8,
  },
  tokenCardCritical: { borderColor: 'rgba(239,68,68,0.25)' },
  tokenInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  progressTrack: { flex: 1, height: 3, backgroundColor: Colors.b1, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  tokenTime: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },

  secDivider: { height: 1, backgroundColor: Colors.b1 },
  secStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 10,
  },
  secItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secVal: { fontSize: 10, color: Colors.t3, fontWeight: '600', letterSpacing: 0.3 },
  secSep: { width: 1, height: 10, backgroundColor: Colors.b1 },

  // Certificate chain
  certChain: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  certTitle: {
    fontSize: 7, fontWeight: '800', color: Colors.t4,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  certNode: { alignItems: 'center', gap: 3 },
  certIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.bgElevated, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  certLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  certArrow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginHorizontal: 4, marginBottom: 12 },
  certLine: { width: 10, height: 1, backgroundColor: Colors.b2 },

  issuerLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingBottom: 4,
  },
  issuerText: { fontSize: 9, color: Colors.t4, fontWeight: '500' },
  issuerSep: { fontSize: 9, color: Colors.t4 },
});
