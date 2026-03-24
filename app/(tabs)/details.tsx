import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';

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

export default function DetailsScreen() {
  const { top } = useSafeAreaInsets();
  const { profile: cardData } = useProfile();
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={[styles.screen, { paddingTop: top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.hTitle}>Card Details</Text>
        <Text style={styles.hSub}>รายละเอียดบัตร</Text>
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
        <Section title="Personal" icon="person" color={Colors.blue} colors={Colors}>
          <Row label="Name (TH)" value={cardData.nameThai} copy colors={Colors} />
          <Row label="Name (EN)" value={cardData.fullNameEnglish} copy colors={Colors} />
          <Row label="Date of Birth" value={cardData.dateOfBirth} sub={cardData.dateOfBirthThai} last colors={Colors} />
        </Section>

        <Section title="Identification" icon="finger-print" color={Colors.gold} colors={Colors}>
          <Row label="ID Number" value={cardData.idNumber} copy colors={Colors} />
          <Row label="Laser Code" value={cardData.laserCode} copy colors={Colors} />
          <Row label="Reference" value={cardData.reference} copy last colors={Colors} />
        </Section>

        <Section title="Address" icon="location" color={Colors.flagRed} colors={Colors}>
          <Row label="Address" value={cardData.addressThai} copy colors={Colors} />
          <Row label="Province" value={cardData.province} colors={Colors} />
          <Row label="District" value={cardData.district} colors={Colors} />
          <Row label="Sub-district" value={cardData.subDistrict} last colors={Colors} />
        </Section>

        <Section title="Validity" icon="calendar" color={Colors.green} colors={Colors}>
          <Row label="Issued" value={cardData.dateOfIssue} colors={Colors} />
          <Row label="Expires" value={cardData.dateOfExpiry} colors={Colors} />
          <Row label="Status" value="Active" last colors={Colors} />
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
