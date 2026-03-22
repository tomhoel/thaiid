import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Card3D from '../../src/components/Card3D';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import ThaiFlag from '../../src/components/ThaiFlag';
import { Colors } from '../../src/constants/colors';
import { cardData } from '../../src/constants/cardData';

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <GarudaEmblem size={28} color={Colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>My Card</Text>
            <Text style={styles.hSub}>บัตรประจำตัวประชาชน</Text>
          </View>
          <ThaiFlag width={28} height={18} />
        </View>

        {/* ═══ CARD SHOWCASE PANEL ═══ */}
        <View style={styles.showcasePanel}>
          {/* Subtle gradient background inside panel */}
          <LinearGradient
            colors={['#F1F5F9', '#E8EDF4', '#F1F5F9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Thai pattern dots — decorative */}
          <View style={styles.patternRow}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={styles.patternDot} />
            ))}
          </View>

          {/* 3D Card */}
          <Card3D />

          {/* Hint */}
          <Text style={styles.hint}>Double-tap to flip  ·  Drag to spin</Text>

          {/* Status strip inside panel */}
          <View style={styles.statusStrip}>
            <View style={styles.statusLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
            <Text style={styles.statusExp}>Valid until {cardData.dateOfExpiry}</Text>
          </View>
        </View>

        {/* ═══ IDENTITY CARD ═══ */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Cardholder</Text>
              <Text style={styles.infoValue}>{cardData.fullNameEnglish}</Text>
              <Text style={styles.infoValueTh}>{cardData.nameThai}</Text>
            </View>
            <View style={styles.infoDiv} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>ID Number</Text>
              <Text style={styles.infoId}>{cardData.idNumber}</Text>
              <Text style={styles.infoValueTh}>Ref. {cardData.reference}</Text>
            </View>
          </View>
        </View>

        {/* ═══ QUICK INFO GRID ═══ */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Ionicons name="calendar-outline" size={18} color={Colors.blue} />
            <Text style={styles.gridLabel}>Issued</Text>
            <Text style={styles.gridValue}>{cardData.dateOfIssue}</Text>
          </View>
          <View style={styles.gridCard}>
            <Ionicons name="location-outline" size={18} color={Colors.flagRed} />
            <Text style={styles.gridLabel}>Province</Text>
            <Text style={styles.gridValue}>{cardData.province}</Text>
          </View>
        </View>

        {/* ═══ ACTIONS ═══ */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.mainBtn, pressed && styles.pressed]}
            onPress={() => router.push('/details')}
          >
            <Ionicons name="document-text" size={17} color="#FFF" />
            <Text style={styles.mainBtnText}>View All Details</Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>

        <View style={styles.actionRow2}>
          <Pressable
            style={({ pressed }) => [styles.secBtn, pressed && styles.pressed]}
            onPress={() => router.push('/digital')}
          >
            <Ionicons name="qr-code" size={18} color={Colors.navy} />
            <Text style={styles.secBtnText}>Digital ID</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secBtn, pressed && styles.pressed]}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.green} />
            <Text style={styles.secBtnText}>Verify</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secBtn, pressed && styles.pressed]}>
            <Ionicons name="share-outline" size={18} color={Colors.blue} />
            <Text style={styles.secBtnText}>Share</Text>
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20 },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 16, paddingBottom: 14,
  },
  hTitle: { fontSize: 24, fontWeight: '800', color: Colors.t1, letterSpacing: -0.5 },
  hSub: { fontSize: 12, color: Colors.t3, marginTop: 1 },

  // ── Showcase panel
  showcasePanel: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 12,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  patternDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.b2,
    opacity: 0.4,
  },
  hint: {
    fontSize: 10,
    color: Colors.t4,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.green },
  statusText: { fontSize: 13, fontWeight: '700', color: Colors.green },
  statusExp: { fontSize: 12, color: Colors.t3 },

  // ── Identity card
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row' },
  infoCol: { flex: 1 },
  infoDiv: { width: 1, backgroundColor: Colors.b1, marginHorizontal: 14 },
  infoLabel: {
    fontSize: 9, fontWeight: '600', color: Colors.t3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.t1 },
  infoValueTh: { fontSize: 11, color: Colors.t3, marginTop: 2 },
  infoId: { fontSize: 14, fontWeight: '700', color: Colors.gold, letterSpacing: 0.5 },

  // ── Quick info grid
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  gridLabel: { fontSize: 10, fontWeight: '600', color: Colors.t3, textTransform: 'uppercase', letterSpacing: 0.5 },
  gridValue: { fontSize: 14, fontWeight: '600', color: Colors.t1 },

  // ── Actions
  actionRow: { marginBottom: 10 },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    backgroundColor: Colors.navy,
    borderRadius: 14,
  },
  mainBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF', flex: 1, textAlign: 'center' },

  actionRow2: { flexDirection: 'row', gap: 8 },
  secBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  secBtnText: { fontSize: 13, fontWeight: '600', color: Colors.t1 },

  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
});
