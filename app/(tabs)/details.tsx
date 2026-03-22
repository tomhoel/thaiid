import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/constants/colors';
import { cardData } from '../../src/constants/cardData';
import GarudaEmblem from '../../src/components/GarudaEmblem';

function Row({ label, value, sub, copy, last }: {
  label: string; value: string; sub?: string; copy?: boolean; last?: boolean;
}) {
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
      {copy && <Ionicons name="copy-outline" size={14} color={Colors.t4} style={{ marginLeft: 6 }} />}
    </Pressable>
  );
}

function Sec({ title, icon, color, children }: {
  title: string; icon: keyof typeof Ionicons.glyphMap; color: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.sec}>
      <View style={styles.secHead}>
        <View style={[styles.secDot, { backgroundColor: color }]} />
        <Text style={styles.secTitle}>{title}</Text>
      </View>
      <View style={styles.secCard}>{children}</View>
    </View>
  );
}

export default function DetailsScreen() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <GarudaEmblem size={28} color={Colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>Card Details</Text>
            <Text style={styles.hSub}>รายละเอียดบัตร</Text>
          </View>
          <Ionicons name="search-outline" size={22} color={Colors.t3} />
        </View>

        {/* Type banner */}
        <View style={styles.typeBanner}>
          <View style={styles.typeIcon}>
            <Ionicons name="card" size={18} color={Colors.gold} />
          </View>
          <View>
            <Text style={styles.typeTitle}>{cardData.titleEnglish}</Text>
            <Text style={styles.typeSub}>{cardData.titleThai}</Text>
          </View>
        </View>

        <Sec title="Personal Information" icon="person" color={Colors.blue}>
          <Row label="Name (TH)" value={cardData.nameThai} copy />
          <Row label="Name (EN)" value={cardData.fullNameEnglish} copy />
          <Row label="Date of Birth" value={cardData.dateOfBirth} sub={cardData.dateOfBirthThai} last />
        </Sec>

        <Sec title="Identification" icon="finger-print" color={Colors.gold}>
          <Row label="ID Number" value={cardData.idNumber} copy />
          <Row label="Laser Code" value={cardData.laserCode} copy />
          <Row label="Reference" value={cardData.reference} copy last />
        </Sec>

        <Sec title="Address" icon="location" color={Colors.flagRed}>
          <Row label="Full Address" value={cardData.addressThai} copy />
          <Row label="Province" value={cardData.province} />
          <Row label="District" value={cardData.district} />
          <Row label="Sub-district" value={cardData.subDistrict} last />
        </Sec>

        <Sec title="Card Validity" icon="calendar" color={Colors.green}>
          <Row label="Date of Issue" value={cardData.dateOfIssue} />
          <Row label="Date of Expiry" value={cardData.dateOfExpiry} />
          <Row label="Status" value="Active" last />
        </Sec>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 16 },
  hTitle: { fontSize: 24, fontWeight: '800', color: Colors.t1, letterSpacing: -0.5 },
  hSub: { fontSize: 12, color: Colors.t3, marginTop: 1 },

  typeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.goldBg, padding: 14, borderRadius: 14, marginBottom: 22,
    borderWidth: 1, borderColor: 'rgba(184, 148, 31, 0.15)',
  },
  typeIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  typeTitle: { fontSize: 14, fontWeight: '600', color: Colors.t1 },
  typeSub: { fontSize: 11, color: Colors.t3, marginTop: 1 },

  sec: { marginBottom: 20 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 4 },
  secDot: { width: 8, height: 8, borderRadius: 4 },
  secTitle: { fontSize: 13, fontWeight: '700', color: Colors.t2, textTransform: 'uppercase', letterSpacing: 0.5 },
  secCard: {
    backgroundColor: Colors.card, borderRadius: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, minHeight: 50,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  noBorder: { borderBottomWidth: 0 },
  rowActive: { backgroundColor: Colors.bgSecondary },
  rLabel: { fontSize: 13, color: Colors.t3, width: 100 },
  rRight: { flex: 1, alignItems: 'flex-end' },
  rVal: { fontSize: 14, fontWeight: '500', color: Colors.t1, textAlign: 'right' },
  rSub: { fontSize: 11, color: Colors.t3, marginTop: 1, textAlign: 'right' },
});
