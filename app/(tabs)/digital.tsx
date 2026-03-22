import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Animated, Dimensions, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCodeDisplay from '../../src/components/QRCodeDisplay';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import ThaiFlag from '../../src/components/ThaiFlag';
import { Colors } from '../../src/constants/colors';
import { cardData } from '../../src/constants/cardData';

const { width: SW } = Dimensions.get('window');

function Pulse() {
  const s = useRef(new Animated.Value(1)).current;
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.parallel([
      Animated.timing(s, { toValue: 2.2, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(o, { toValue: 0, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View style={[styles.pulse, { transform: [{ scale: s }], opacity: o }]} />;
}

export default function DigitalScreen() {
  const { top } = useSafeAreaInsets();
  const qr = JSON.stringify({
    type: 'THAI_NATIONAL_ID', id: cardData.idNumberCompact,
    name: cardData.fullNameEnglish, expiry: cardData.dateOfExpiry,
  });

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <GarudaEmblem size={28} color={Colors.navy} />
          <View>
            <Text style={styles.hTitle}>Digital ID</Text>
            <Text style={styles.hSub}>บัตรประชาชนดิจิทัล</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusCircle}>
              <Pulse />
              <View style={styles.statusInner}>
                <Ionicons name="shield-checkmark" size={24} color={Colors.green} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Identity Verified</Text>
              <Text style={styles.statusSub}>ยืนยันตัวตนแล้ว · Valid until {cardData.dateOfExpiry}</Text>
            </View>
            <ThaiFlag width={28} height={18} />
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            {/* Corners */}
            <View style={[styles.c, styles.ctl]} />
            <View style={[styles.c, styles.ctr]} />
            <View style={[styles.c, styles.cbl]} />
            <View style={[styles.c, styles.cbr]} />
            <QRCodeDisplay value={qr} size={SW * 0.44} color={Colors.navy} />
          </View>
          <View style={styles.qrInfo}>
            <Text style={styles.qrName}>{cardData.fullNameEnglish}</Text>
            <Text style={styles.qrNameTh}>{cardData.nameThai}</Text>
            <View style={styles.qrIdRow}>
              <Ionicons name="finger-print" size={14} color={Colors.gold} />
              <Text style={styles.qrId}>{cardData.idNumber}</Text>
            </View>
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Ionicons name="calendar-outline" size={16} color={Colors.blue} />
            <Text style={styles.gLabel}>Issued</Text>
            <Text style={styles.gVal}>{cardData.dateOfIssue}</Text>
          </View>
          <View style={styles.gridSep} />
          <View style={styles.gridItem}>
            <Ionicons name="time-outline" size={16} color={Colors.orange} />
            <Text style={styles.gLabel}>Expires</Text>
            <Text style={styles.gVal}>{cardData.dateOfExpiry}</Text>
          </View>
          <View style={styles.gridSep} />
          <View style={styles.gridItem}>
            <Ionicons name="barcode-outline" size={16} color={Colors.t3} />
            <Text style={styles.gLabel}>Laser</Text>
            <Text style={styles.gVal}>{cardData.laserCode}</Text>
          </View>
        </View>

        {/* Note */}
        <View style={styles.note}>
          <Ionicons name="information-circle" size={18} color={Colors.blue} />
          <Text style={styles.noteText}>This digital ID is for reference only. Please present your physical card for official verification purposes.</Text>
        </View>

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

  statusCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 18,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCircle: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.green },
  statusInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.greenBg, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.green },
  statusSub: { fontSize: 11, color: Colors.t3, marginTop: 2 },

  qrCard: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  qrBox: { padding: 18, marginBottom: 16 },
  c: { position: 'absolute', width: 20, height: 20, borderColor: Colors.gold },
  ctl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  ctr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cbl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cbr: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  qrInfo: { alignItems: 'center' },
  qrName: { fontSize: 17, fontWeight: '700', color: Colors.t1 },
  qrNameTh: { fontSize: 12, color: Colors.t3, marginTop: 2 },
  qrIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: Colors.goldBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  qrId: { fontSize: 13, fontWeight: '600', color: Colors.gold, letterSpacing: 0.8 },

  grid: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  gridItem: { flex: 1, alignItems: 'center', gap: 4 },
  gridSep: { width: 1, backgroundColor: Colors.b1 },
  gLabel: { fontSize: 9, fontWeight: '600', color: Colors.t3, textTransform: 'uppercase', letterSpacing: 0.5 },
  gVal: { fontSize: 12, fontWeight: '600', color: Colors.t1 },

  note: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.blueBg, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(3, 105, 161, 0.1)',
  },
  noteText: { fontSize: 13, color: Colors.t2, flex: 1, lineHeight: 20 },
});
