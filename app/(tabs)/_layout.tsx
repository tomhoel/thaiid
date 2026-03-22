import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.t4,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Card',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'card' : 'card-outline'} size={21} color={color} />
        ),
      }} />
      <Tabs.Screen name="details" options={{
        title: 'Details',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'list' : 'list-outline'} size={21} color={color} />
        ),
      }} />
      <Tabs.Screen name="digital" options={{
        title: 'Digital',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={21} color={color} />
        ),
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'cog' : 'cog-outline'} size={21} color={color} />
        ),
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
    // Extra bottom padding — clears Pixel 10 Pro gesture nav line
    height: 82,
    paddingTop: 8,
    paddingBottom: 28,
    elevation: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
