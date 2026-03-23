import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.goldLight,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Identity',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'card' : 'card-outline'} size={20} color={color} />
        ),
      }} />
      <Tabs.Screen name="digital" options={{
        title: 'QR Code',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={20} color={color} />
        ),
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'cog' : 'cog-outline'} size={20} color={color} />
        ),
      }} />
      <Tabs.Screen name="details" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.navy,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
    height: 78,
    paddingTop: 6,
    paddingBottom: 28,
    elevation: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  icon: {
    marginBottom: -2,
  },
});
