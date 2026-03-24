import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GarudaEmblem from './GarudaEmblem';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../i18n/LanguageContext';

interface Props {
  title: string;
  sub: string;
}

export default function ScreenHeader({ title, sub }: Props) {
  const { top } = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang, toggle } = useLang();

  return (
    <View style={[styles.bar, { paddingTop: top + 8, backgroundColor: colors.navy, borderBottomColor: 'rgba(255,255,255,0.10)' }]}>
      <View style={styles.left}>
        <GarudaEmblem size={32} />
        <View>
          <Text style={[styles.title, { color: 'rgba(255,255,255,0.92)' }]}>{title}</Text>
          <Text style={[styles.sub, { color: 'rgba(255,255,255,0.50)' }]}>{sub}</Text>
        </View>
      </View>
      <Pressable
        style={[styles.langBtn, { borderColor: 'rgba(255,255,255,0.18)' }]}
        onPress={toggle}
      >
        <Text style={[styles.langText, { color: lang === 'en' ? colors.goldLight : 'rgba(255,255,255,0.45)' }]}>EN</Text>
        <View style={[styles.langDot, { backgroundColor: 'rgba(255,255,255,0.30)' }]} />
        <Text style={[styles.langText, { color: lang === 'th' ? colors.goldLight : 'rgba(255,255,255,0.45)' }]}>TH</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 9, marginTop: 1 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  langText: { fontSize: 12, fontWeight: '700' },
  langDot: { width: 3, height: 3, borderRadius: 2 },
});
