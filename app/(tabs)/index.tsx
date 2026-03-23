import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import FlippableCard from '../../src/components/FlippableCard';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import { Colors } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { useLang } from '../../src/i18n/LanguageContext';

function copyValue(val: string) {
  Clipboard.setStringAsync(val);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function InfoRow({ icon, label, value, last }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={15} color={Colors.t4} style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const { lang, toggle, t } = useLang();
  const { profile: cardData } = useProfile();

  return (
    <View style={[styles.screen, { paddingTop: top + 8 }]}>

      {/* ── Header ── */}
      <View style={styles.headerBanner}>
        <View style={styles.headerLeft}>
          <GarudaEmblem size={32} />
          <View>
            <Text style={styles.headerTitle}>{t('header.title')}</Text>
            <Text style={styles.headerSub}>{t('header.sub')}</Text>
          </View>
        </View>
        <Pressable style={styles.langSwitch} onPress={toggle}>
          <Text style={[styles.langLabel, lang === 'en' && styles.langActive]}>EN</Text>
          <View style={styles.langDot} />
          <Text style={[styles.langLabel, lang === 'th' && styles.langActive]}>TH</Text>
        </Pressable>
      </View>

      {/* ── Card ── */}
      <View style={styles.cardSection}>
        <FlippableCard />
        <Text style={styles.flipHint}>{t('card.flipHint')}</Text>
      </View>

      {/* ── Cardholder ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('section.cardholder')}</Text>
        <View style={styles.sectionLine} />
      </View>
      <View style={styles.cardholderCard}>
        <View style={styles.cardholderTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {cardData.firstName.charAt(0)}{cardData.lastName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameEn}>{lang === 'en' ? cardData.fullNameEnglish : cardData.nameThai}</Text>
            <Text style={styles.nameTh}>{lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish}</Text>
          </View>
        </View>
        <View style={styles.cardholderDivider} />
        <View style={styles.cardholderBottom}>
          <View style={styles.idField}>
            <Text style={styles.idFieldLabel}>{t('id.label')}</Text>
            <Text style={styles.idFieldValue}>{cardData.idNumber}</Text>
          </View>
          <Pressable style={styles.copyBtn} onPress={() => copyValue(cardData.idNumber)}>
            <Ionicons name="copy-outline" size={14} color={Colors.goldLight} />
          </Pressable>
        </View>
        <View style={styles.refRow}>
          <Text style={styles.refLabel}>Ref.</Text>
          <Text style={styles.refValue}>{cardData.reference}</Text>
        </View>
      </View>

      {/* ── Card Information ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('section.cardInfo')}</Text>
        <View style={styles.sectionLine} />
      </View>
      <View style={styles.infoCard}>
        <InfoRow icon="calendar-outline" label={t('info.dob')} value={lang === 'en' ? cardData.dateOfBirth : cardData.dateOfBirthThai} />
        <InfoRow icon="location-outline" label={t('info.province')} value={cardData.province} />
        <InfoRow icon="home-outline" label={t('info.district')} value={cardData.district} />
        <InfoRow icon="document-text-outline" label={t('info.issued')} value={lang === 'en' ? cardData.dateOfIssue : cardData.dateOfIssueThai} />
        <InfoRow icon="shield-checkmark-outline" label={t('info.expires')} value={lang === 'en' ? cardData.dateOfExpiry : cardData.dateOfExpiryThai} last />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 16 },

  // Header
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.b1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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

  // Card
  cardSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  flipHint: { fontSize: 11, color: Colors.t4, marginTop: 6 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.b1,
    marginLeft: 6,
  },

  // Cardholder
  cardholderCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.b1,
    marginBottom: 14,
  },
  cardholderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.goldBg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: Colors.goldLight },
  nameEn: { fontSize: 14, fontWeight: '700', color: Colors.t1 },
  nameTh: { fontSize: 10, color: Colors.t4, marginTop: 1 },
  cardholderDivider: { height: 1, backgroundColor: Colors.b1, marginVertical: 8 },
  cardholderBottom: { flexDirection: 'row', alignItems: 'center' },
  idField: { flex: 1 },
  idFieldLabel: {
    fontSize: 8, fontWeight: '600', color: Colors.t4,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  idFieldValue: { fontSize: 15, fontWeight: '800', color: Colors.goldLight, letterSpacing: 0.8 },
  copyBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  refLabel: { fontSize: 9, color: Colors.t4 },
  refValue: { fontSize: 9, fontWeight: '500', color: Colors.t3 },

  // Card Information
  infoCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.b1,
  },
  infoLabel: { flex: 1, fontSize: 12, color: Colors.t3 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.t1 },
});
