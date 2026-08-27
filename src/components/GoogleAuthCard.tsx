import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSnackbar } from '../context/SnackbarContext';

export default function GoogleAuthCard() {
  const { user, loading, isAuthenticated, signInWithGoogle, signOut } = useAuth();
  const { colors } = useTheme();
  const snackbar = useSnackbar();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      snackbar.show(err?.message || 'Google sign-in failed', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      snackbar.show('Signed out successfully', 'info');
    } catch (err: any) {
      snackbar.show(err?.message || 'Failed to sign out', 'error');
    }
  };

  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Citizen';
  const userEmail = user?.email || '';

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.b2 }]}>
      {isAuthenticated && user ? (
        <View style={styles.loggedInContainer}>
          <View style={styles.userRow}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.navy }]}>
                <Text style={styles.avatarFallbackText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.t1 }]} numberOfLines={1}>
                  {userName}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>Google</Text>
                </View>
              </View>
              <Text style={[styles.userEmail, { color: colors.t2 }]} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={styles.cloudSyncIndicator}>
              <Ionicons name="cloud-done-outline" size={14} color="#10B981" />
              <Text style={styles.cloudSyncText}>Cloud Sync Active</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
              onPress={handleSignOut}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={14} color="#EF4444" />
                  <Text style={styles.signOutBtnText}>Sign Out</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.loggedOutContainer}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(66, 133, 244, 0.12)' }]}>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: colors.t1 }]}>
                Google Account & Cloud
              </Text>
              <Text style={[styles.subtitle, { color: colors.t2 }]}>
                Sign in to sync your cards, photos, and ID profiles across devices.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0C1526" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#0C1526" style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  loggedInContainer: {
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#4285F4',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  cloudSyncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cloudSyncText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 4,
  },
  signOutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  loggedOutContainer: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnText: {
    color: '#0C1526',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
