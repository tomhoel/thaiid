import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { cardData } from '../../src/constants/cardData';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import ThaiFlag from '../../src/components/ThaiFlag';

function Item({ icon, label, value, toggle, onToggle, last, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string;
  toggle?: boolean; onToggle?: (v: boolean) => void; last?: boolean; color?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, last && styles.noBorder, pressed && !toggle && styles.itemActive]}
      disabled={toggle !== undefined}
    >
      <View style={[styles.iconBox, { backgroundColor: (color || Colors.blue) + '12' }]}>
        <Ionicons name={icon} size={18} color={color || Colors.blue} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
      {toggle !== undefined ? (
        <Switch value={toggle} onValueChange={onToggle}
          trackColor={{ false: Colors.b2, true: Colors.blue }}
          thumbColor="#fff"
          style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : undefined}
        />
      ) : (
        <View style={styles.itemRight}>
          {value && <Text style={styles.itemVal}>{value}</Text>}
          <Ionicons name="chevron-forward" size={16} color={Colors.t4} />
        </View>
      )}
    </Pressable>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const [bio, setBio] = useState(false);
  const [notif, setNotif] = useState(true);

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Settings</Text>

        {/* Profile */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <GarudaEmblem size={30} color={Colors.goldLight} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{cardData.fullNameEnglish}</Text>
            <Text style={styles.profileNameTh}>{cardData.nameThai}</Text>
            <View style={styles.profileBadge}>
              <View style={styles.profileDot} />
              <Text style={styles.profileBadgeText}>Verified</Text>
            </View>
          </View>
          <ThaiFlag width={32} height={20} />
        </View>

        <Group label="Security">
          <Item icon="finger-print-outline" label="Biometric Lock" toggle={bio} onToggle={setBio} color={Colors.blue} />
          <Item icon="lock-closed-outline" label="Change PIN" color={Colors.blue} />
          <Item icon="eye-off-outline" label="Privacy Mode" color={Colors.blue} last />
        </Group>

        <Group label="Preferences">
          <Item icon="notifications-outline" label="Notifications" toggle={notif} onToggle={setNotif} color={Colors.orange} />
          <Item icon="language-outline" label="Language" value="EN / TH" color={Colors.orange} />
          <Item icon="sunny-outline" label="Theme" value="Light" color={Colors.orange} last />
        </Group>

        <Group label="About">
          <Item icon="information-circle-outline" label="Version" value="1.0.0" color={Colors.t3} />
          <Item icon="document-text-outline" label="Terms of Service" color={Colors.t3} />
          <Item icon="shield-outline" label="Privacy Policy" color={Colors.t3} />
          <Item icon="help-circle-outline" label="Help & Support" color={Colors.t3} last />
        </Group>

        {/* Government footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <GarudaEmblem size={28} color={Colors.t4} opacity={0.5} />
          <Text style={styles.footerTitle}>กรมการปกครอง กระทรวงมหาดไทย</Text>
          <Text style={styles.footerSub}>Department of Provincial Administration</Text>
          <Text style={styles.footerSub}>Ministry of Interior, Kingdom of Thailand</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.t1, paddingTop: 16, marginBottom: 20, letterSpacing: -0.5 },

  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.navy, borderRadius: 20, padding: 18, marginBottom: 26,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.tWhite },
  profileNameTh: { fontSize: 12, color: Colors.t4, marginTop: 1 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  profileDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4ADE80' },
  profileBadgeText: { fontSize: 10, fontWeight: '600', color: '#4ADE80' },

  group: { marginBottom: 22 },
  groupLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.t3, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.card, borderRadius: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 16, minHeight: 54,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  noBorder: { borderBottomWidth: 0 },
  itemActive: { backgroundColor: Colors.bgSecondary },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.t1 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemVal: { fontSize: 13, color: Colors.t3 },

  footer: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  footerLine: { width: 32, height: 2, backgroundColor: Colors.b1, borderRadius: 1, marginBottom: 10 },
  footerTitle: { fontSize: 12, fontWeight: '500', color: Colors.t3, marginTop: 4 },
  footerSub: { fontSize: 10, color: Colors.t4, lineHeight: 14 },
});
