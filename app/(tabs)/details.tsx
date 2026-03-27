import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';
import { useCountry } from '../../src/context/CountryContext';

/* ── Helpers ── */

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

/* ── Sub-components ── */

function Row({ label, value, sub, copy, last, colors }: {
  label: string; value: string; sub?: string; copy?: boolean; last?: boolean; colors: ColorPalette;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tap = async () => {
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  return (
    <Pressable
      onPress={copy ? tap : undefined}
      disabled={!copy}
      style={({ pressed }) => [styles.row, last && styles.noBorder, copy && pressed && styles.rowActive]}
    >
      <Text style={styles.rLabel}>{label}</Text>
      <View style={styles.rRight}>
        <Text style={styles.rVal}>{value}</Text>
        {sub && <Text style={styles.rSub}>{sub}</Text>}
      </View>
      {copy && <Ionicons name="copy-outline" size={12} color={colors.t4} style={{ marginLeft: 4 }} />}
    </Pressable>
  );
}

function Section({ title, icon, color, children, colors }: {
  title: string; icon: keyof typeof Ionicons.glyphMap; color: string; children: React.ReactNode; colors: ColorPalette;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.sec}>
      <View style={styles.secHead}>
        <View style={[styles.secIcon, { backgroundColor: color + '14' }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={styles.secTitle}>{title}</Text>
      </View>
      <View style={styles.secCard}>{children}</View>
    </View>
  );
}

/* ── Screen ── */

export default function DetailsScreen() {
  const { top } = useSafeAreaInsets();
  const { profile: cardData } = useProfile();
  const { colors: Colors } = useTheme();
  const { t, lang } = useLang();
  const { config } = useCountry();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const title = lang === 'en' ? 'Card Details' : t('details.cardDetails');
  const subtitle = lang === 'en' ? t('details.cardDetails') : 'Card Details';

  const status = useMemo(
    () => validityStatus(cardData.isValid, cardData.dateOfExpiry),
    [cardData.isValid, cardData.dateOfExpiry],
  );

  const statusLabel = status === 'valid'
    ? t('details.statusActive')
    : status === 'expiring'
      ? t('details.statusExpiring')
      : t('details.statusExpired');

  // Country-aware name label: show the secondary language name
  const localNameLabel = lang === 'en'
    ? `${t('details.name')} (${config.secondaryLanguage.label})`
    : `${t('details.name')} (${config.secondaryLanguage.label})`;

  return (
    <View style={[styles.screen, { paddingTop: top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.hTitle}>{title}</Text>
        <Text style={styles.hSub}>{subtitle}</Text>
      </View>

      {/* Type chip */}
      <View style={styles.typeChip}>
        <View style={styles.typeIconWrap}>
          <Ionicons name="card" size={14} color={Colors.goldLight} />
        </View>
        <Text style={styles.typeText}>{cardData.titleEnglish}</Text>
        <Text style={styles.typeDot}>·</Text>
        <Text style={styles.typeTh}>{cardData.titleThai}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Section title={t('details.personal')} icon="person" color={Colors.blue} colors={Colors}>
          <Row label={localNameLabel} value={cardData.nameThai} copy colors={Colors} />
          <Row label={`${t('details.name')} (EN)`} value={cardData.fullNameEnglish} copy colors={Colors} />
          <Row label={t('details.dob')} value={cardData.dateOfBirth} sub={cardData.dateOfBirthThai} last colors={Colors} />
        </Section>

        <Section title={t('details.identification')} icon="finger-print" color={Colors.gold} colors={Colors}>
          <Row label={t('details.idNumber')} value={cardData.idNumber} copy colors={Colors} />
          <Row label={t('info.laser')} value={cardData.laserCode} copy colors={Colors} />
          <Row label={t('details.reference')} value={cardData.reference} copy last colors={Colors} />
        </Section>

        <Section title={t('info.address')} icon="location" color={Colors.flagRed} colors={Colors}>
          <Row label={t('info.address')} value={cardData.addressThai} copy colors={Colors} />
          <Row label={t('info.province')} value={cardData.province} colors={Colors} />
          <Row label={t('info.district')} value={cardData.district} colors={Colors} />
          <Row label={t('details.subDistrict')} value={cardData.subDistrict} last colors={Colors} />
        </Section>

        <Section title={t('details.validity')} icon="calendar" color={Colors.green} colors={Colors}>
          <Row label={t('details.issued')} value={cardData.dateOfIssue} colors={Colors} />
          <Row label={t('details.expires')} value={cardData.dateOfExpiry} colors={Colors} />
          <Row label={t('details.status')} value={statusLabel} last colors={Colors} />
        </Section>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16 },

  header: { paddingHorizontal: 16, marginBottom: 10 },
  hTitle: { fontSize: 20, fontWeight: '800', color: Colors.t1, letterSpacing: -0.5 },
  hSub: { fontSize: 10, color: Colors.t3, marginTop: 2 },

  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  typeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { fontSize: 12, fontWeight: '600', color: Colors.t1 },
  typeDot: { color: Colors.t4, fontSize: 12 },
  typeTh: { fontSize: 11, color: Colors.t3 },

  sec: { marginBottom: 14 },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
    marginLeft: 4,
  },
  secIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.t2,
    letterSpacing: 0.3,
  },
  secCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  noBorder: { borderBottomWidth: 0 },
  rowActive: { backgroundColor: Colors.bgSurface },
  rLabel: { fontSize: 12, color: Colors.t3, width: 90 },
  rRight: { flex: 1, alignItems: 'flex-end' },
  rVal: { fontSize: 13, fontWeight: '500', color: Colors.t1, textAlign: 'right' },
  rSub: { fontSize: 10, color: Colors.t3, marginTop: 1, textAlign: 'right' },
});
