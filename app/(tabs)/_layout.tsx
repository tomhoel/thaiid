import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabLayout() {
  const { theme, colors } = useTheme();

  return (
    <Tabs
      screenOptions={{ lazy: false,
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: colors.goldLight,
        tabBarInactiveTintColor: theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? colors.navy : colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: colors.b1,
          height: 78,
          paddingTop: 6,
          paddingBottom: 28,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 1 },
        tabBarIconStyle: { marginBottom: -2 },
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
