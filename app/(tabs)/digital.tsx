import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import QRCodeDisplay from '../../src/components/QRCodeDisplay';
import DopaSeal from '../../assets/images/dopa-seal.svg';
import { Colors } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';

const { width: SW } = Dimensions.get('window');
const REGEN_SECS = 60;


export default function DigitalScreen() {
  const { top } = useSafeAreaInsets();
  const { lang, toggle, t } = useLang();
  const { profile: cardData } = useProfile();

  // Countdown
  const [remaining, setRemaining] = useState(REGEN_SECS);
  const [colonVisible, setColonVisible] = useState(true);
  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(prev => (prev <= 1 ? REGEN_SECS : prev - 1));
    }, 1000);
    const blink = setInterval(() => setColonVisible(v => !v), 500);
    return () => { clearInterval(tick); clearInterval(blink); };
  }, []);

  // Spin icon on regeneration
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (remaining === REGEN_SECS) {
      Animated.timing(spinAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start(() => spinAnim.setValue(0));
    }
  }, [remaining]);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const [generatedAt] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')}`;
  });

  const mins = Math.floor(remaining / 60);
  const secs = (remaining % 60).toString().padStart(2, '0');
  
  const isCritical = remaining <= 10;
  const isWarning = remaining <= 25 && remaining > 10;
  const activeSegs = Math.ceil((remaining / REGEN_SECS) * 10);
  const segColor = isCritical ? Colors.red : isWarning ? Colors.orange : Colors.green;

  const qr = JSON.stringify({
    type: 'THAI_NATIONAL_ID', id: cardData.idNumberCompact,
    name: cardData.fullNameEnglish, expiry: cardData.dateOfExpiry,
  });

  return (
    <View style={[styles.screen, { paddingTop: top + 8 }]}>

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

      {/* ── Digital ID Card ── */}
      <View style={styles.idCard}>

        {/* Thai flag stripe */}
        <View style={styles.flagStripe}>
          <View style={[styles.flagSeg, { flex: 2, backgroundColor: Colors.flagRed }]} />
          <View style={[styles.flagSeg, { flex: 1.5, backgroundColor: 'rgba(255,255,255,0.82)' }]} />
          <View style={[styles.flagSeg, { flex: 3, backgroundColor: Colors.blue }]} />
          <View style={[styles.flagSeg, { flex: 1.5, backgroundColor: 'rgba(255,255,255,0.82)' }]} />
          <View style={[styles.flagSeg, { flex: 2, backgroundColor: Colors.flagRed }]} />
        </View>

        {/* Issuer header */}
        <View style={styles.issuerRow}>
          <View style={styles.sealRing}>
            <DopaSeal width={28} height={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.issuerKingdom}>KINGDOM OF THAILAND</Text>
            <Text style={styles.issuerName}>กรมการปกครอง</Text>
            <Text style={styles.issuerSub}>Dept. of Provincial Administration</Text>
          </View>
          <View style={styles.validBadge}>
            <View style={styles.validDot} />
            <Text style={styles.validText}>{lang === 'en' ? 'Valid' : 'ใช้ได้'}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Cardholder row */}
        <View style={styles.idCardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {cardData.firstName.charAt(0)}{cardData.lastName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.idCardName}>
              {lang === 'en' ? cardData.fullNameEnglish.toUpperCase() : cardData.nameThai}
            </Text>
            <Text style={styles.idCardNameSub}>
              {lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Divider between cardholder and QR */}
        <View style={styles.cardDivider} />

        {/* QR Code */}
        <View style={styles.qrCenter}>
          <View style={styles.qrWhiteBox}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
            <QRCodeDisplay value={qr} size={SW * 0.52} color={Colors.navy} />
          </View>
        </View>

        {/* ID Number footer */}
        <View style={styles.idCardFooter}>
          <Text style={styles.idNumberLabel}>{t('id.label')}</Text>
          <Text style={styles.idNumber}>{cardData.idNumber}</Text>
        </View>
      </View>

      {/* ── Section: Token Refresh ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{lang === 'en' ? 'Token Refresh' : 'รีเฟรชโทเค็น'}</Text>
        <View style={styles.sectionLine} />
      </View>

      {/* ── Countdown Card ── */}
      <View style={[styles.countdownCard, isCritical && styles.countdownCardCritical]}>

        {/* Header row */}
        <View style={styles.countdownHeader}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh-outline" size={14} color={segColor} />
          </Animated.View>
          <Text style={styles.countdownTitle}>
            {lang === 'en' ? 'Token Session' : 'โทเค็นเซสชัน'}
          </Text>
          <View style={styles.activeBadge}>
            <View style={[styles.activeDot, { backgroundColor: segColor }]} />
            <Text style={[styles.activeText, { color: segColor }]}>
              {isCritical ? (lang === 'en' ? 'EXPIRING' : 'หมดอายุ') : (lang === 'en' ? 'ACTIVE' : 'ใช้งาน')}
            </Text>
          </View>
        </View>

        <View style={styles.countdownInnerDivider} />

        {/* Body: segments + digits */}
        <View style={styles.countdownBody}>
          <View style={styles.segmentsWrap}>
            {Array.from({ length: 10 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.segment,
                  i < activeSegs
                    ? { backgroundColor: segColor, opacity: 0.85 + i * 0.015 }
                    : styles.segmentOff,
                ]}
              />
            ))}
          </View>
          <View style={styles.countdownDisplay}>
            <Text style={[styles.countdownDigit, { color: segColor }]}>
              {mins}
            </Text>
            <Text style={[styles.countdownColon, !colonVisible && { opacity: 0 }, { color: segColor }]}>
              :
            </Text>
            <Text style={[styles.countdownDigit, { color: segColor }]}>
              {secs}
            </Text>
          </View>
        </View>

        <View style={styles.countdownInnerDivider} />

        {/* Footer: 3-stat security strip */}
        <View style={styles.countdownFooter}>
          <View style={styles.footerStat}>
            <Text style={styles.footerStatLabel}>{lang === 'en' ? 'PROTOCOL' : 'โปรโตคอล'}</Text>
            <Text style={styles.footerStatValue}>ThaID</Text>
          </View>
          <View style={styles.footerDividerV} />
          <View style={styles.footerStat}>
            <Text style={styles.footerStatLabel}>{lang === 'en' ? 'CIPHER' : 'การเข้ารหัส'}</Text>
            <Text style={styles.footerStatValue}>AES-256</Text>
          </View>
          <View style={styles.footerDividerV} />
          <View style={styles.footerStat}>
            <Text style={styles.footerStatLabel}>{lang === 'en' ? 'GENERATED' : 'สร้างเมื่อ'}</Text>
            <Text style={styles.footerStatValue}>{generatedAt}</Text>
          </View>
        </View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 16 },

  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.t1, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, color: Colors.t4, marginTop: 1 },
  langSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  langLabel: { fontSize: 12, fontWeight: '700', color: Colors.t4 },
  langActive: { color: Colors.goldLight },
  langDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.t4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.t3, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.b1, marginLeft: 6 },

  // Thai flag stripe
  flagStripe: { flexDirection: 'row', height: 5 },
  flagSeg: { height: 5 },

  // Issuer header
  issuerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sealRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5,
    borderColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issuerKingdom: {
    fontSize: 7,
    fontWeight: '800',
    color: Colors.goldLight,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 2,
  },
  issuerName: { fontSize: 11, fontWeight: '800', color: Colors.t1, letterSpacing: 0.2 },
  issuerSub: { fontSize: 8, color: Colors.t3, marginTop: 1.5 },

  // Digital ID Card
  idCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.b1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  idCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.goldBg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '700', color: Colors.goldLight },
  idCardName: { fontSize: 13, fontWeight: '800', color: Colors.t1, letterSpacing: 0.3 },
  idCardNameSub: { fontSize: 10, color: Colors.t4, marginTop: 1 },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
  },
  validDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.green },
  validText: { fontSize: 10, fontWeight: '700', color: Colors.green },

  cardDivider: { height: 1, backgroundColor: Colors.b1 },
  qrCenter: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  qrWhiteBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },
  corner: { position: 'absolute', width: 14, height: 14, borderColor: Colors.goldLight },
  cTL: { top: 5, left: 5, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 3 },
  cTR: { top: 5, right: 5, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 3 },
  cBL: { bottom: 5, left: 5, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 3 },
  cBR: { bottom: 5, right: 5, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 3 },

  idCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
  },
  idNumberLabel: {
    fontSize: 8, fontWeight: '600', color: Colors.t4,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  idNumber: { fontSize: 14, fontWeight: '800', color: Colors.goldLight, letterSpacing: 1 },

  countdownCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  countdownCardCritical: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countdownTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.t2, letterSpacing: 0.2 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  countdownInnerDivider: { height: 1, backgroundColor: Colors.b1 },
  countdownBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  segmentsWrap: { flex: 1, flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  segment: { flex: 1, height: 28, borderRadius: 3 },
  segmentOff: { backgroundColor: Colors.b1, height: 28, borderRadius: 3 },
  countdownDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  countdownDigit: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.t1,
    letterSpacing: -1,
  },
  countdownColon: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.t3,
    marginBottom: 2,
  },

  // Countdown footer: 3-stat strip
  countdownFooter: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  footerStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    gap: 2,
  },
  footerStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.t4,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  footerStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.t2,
    letterSpacing: 0.2,
  },
  footerDividerV: {
    width: 1,
    backgroundColor: Colors.b1,
    marginVertical: 8,
  },
});
