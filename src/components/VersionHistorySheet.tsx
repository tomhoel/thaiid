/**
 * VersionHistorySheet — Bottom sheet showing previously generated card versions.
 * Triggered by long-press on the card. Supports restore & multi-select delete.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, Image, Pressable, Dimensions,
  Modal, ScrollView, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
  runOnJS, interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useCountry } from '../context/CountryContext';
import { useProfile } from '../context/ProfileContext';
import {
  getVersions, deleteVersions,
  type CardVersion,
} from '../utils/versionHistory';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const THUMB_W = (SCREEN_W - 60) / 2;
const THUMB_H = THUMB_W * 0.63; // card aspect ratio

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function VersionHistorySheet({ visible, onClose }: Props) {
  const { colors: C } = useTheme();
  const { country, config } = useCountry();
  const { updateProfile } = useProfile();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [versions, setVersions] = useState<CardVersion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Animation
  const slideY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  const load = useCallback(async () => {
    const v = await getVersions(country);
    setVersions(v);
  }, [country]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      load();
      setSelected(new Set());
      setSelectMode(false);
      slideY.value = withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else {
      slideY.value = withTiming(SCREEN_H, { duration: 260, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 220 });
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const close = useCallback(() => {
    slideY.value = withTiming(SCREEN_H, { duration: 260, easing: Easing.in(Easing.cubic) });
    backdropOpacity.value = withTiming(0, { duration: 220 });
    setTimeout(onClose, 280);
  }, [onClose]);

  const handleRestore = useCallback((version: CardVersion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateProfile({
      ...version.profileSnapshot,
      cardFrontUri: version.cardImageUri,
      ...(version.portraitUri ? { pictureUri: version.portraitUri } : {}),
    });
    close();
  }, [updateProfile, close]);

  const toggleSelect = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterSelectMode = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectMode(true);
    setSelected(new Set([id]));
  }, []);

  const handleDelete = useCallback(() => {
    if (selected.size === 0) return;
    Alert.alert(
      `Delete ${selected.size} version${selected.size > 1 ? 's' : ''}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVersions(country, [...selected]);
            setSelected(new Set());
            setSelectMode(false);
            load();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [selected, country, load]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!visible && !mounted) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible={visible}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Previous Versions</Text>
            <Text style={styles.subtitle}>
              {config.name.english} {versions.length > 0 ? `\u00B7 ${versions.length} saved` : ''}
            </Text>
          </View>

          {selectMode ? (
            <View style={styles.headerActions}>
              <Pressable style={styles.headerBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={17} color={C.red} />
                <Text style={[styles.headerBtnLabel, { color: C.red }]}>{selected.size}</Text>
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={() => { setSelectMode(false); setSelected(new Set()); }}
              >
                <Text style={[styles.headerBtnLabel, { color: C.t2 }]}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.closeBtn} onPress={close}>
              <Ionicons name="close" size={18} color={C.t3} />
            </Pressable>
          )}
        </View>

        {/* Grid */}
        {versions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="layers-outline" size={36} color={C.t4} />
            <Text style={styles.emptyText}>No saved versions yet</Text>
            <Text style={styles.emptyHint}>Generated cards will appear here</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {versions.map((v) => {
              const isSelected = selected.has(v.id);
              return (
                <Pressable
                  key={v.id}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                  ]}
                  onPress={() => selectMode ? toggleSelect(v.id) : handleRestore(v)}
                  onLongPress={() => !selectMode ? enterSelectMode(v.id) : undefined}
                >
                  {/* Selection indicator */}
                  {selectMode && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  )}

                  {/* Card thumbnail */}
                  <View style={styles.thumbWrap}>
                    <Image
                      source={{ uri: v.cardImageUri }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Meta */}
                  <View style={styles.meta}>
                    <Text style={styles.metaDate} numberOfLines={1}>
                      {formatDate(v.timestamp)}
                    </Text>
                    <Text style={styles.metaTime} numberOfLines={1}>
                      {formatTime(v.timestamp)}
                    </Text>
                    {v.profileSnapshot.dateOfBirth && (
                      <Text style={styles.metaDetail} numberOfLines={1}>
                        DOB {v.profileSnapshot.dateOfBirth}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.65,
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // safe area
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.b2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: C.t1,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    color: C.t3,
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: C.bgSurface,
  },
  headerBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 12,
  },
  card: {
    width: THUMB_W,
    borderRadius: 12,
    backgroundColor: C.bgSurface,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: C.red,
    backgroundColor: `${C.red}08`,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.t4,
    backgroundColor: C.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: C.red,
    borderColor: C.red,
  },
  thumbWrap: {
    width: '100%',
    height: THUMB_H,
    backgroundColor: C.bg,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  meta: {
    padding: 10,
    gap: 1,
  },
  metaDate: {
    fontSize: 12,
    fontWeight: '600',
    color: C.t1,
    letterSpacing: 0.1,
  },
  metaTime: {
    fontSize: 10,
    color: C.t3,
    fontVariant: ['tabular-nums'],
  },
  metaDetail: {
    fontSize: 10,
    color: C.t4,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.t3,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 11,
    color: C.t4,
  },
});
