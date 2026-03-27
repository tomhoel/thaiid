import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { type ColorPalette } from '../constants/colors';

interface ModernDatePickerProps {
  visible: boolean;
  value: string; // e.g. "12 Jan 1990"
  onClose: () => void;
  onApply: (date: string) => void;
  title?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => (currentYear - 80 + i).toString()).reverse();

const ITEM_HEIGHT = 44;

/** Return the maximum valid day for a given month (1-indexed) and year. */
function maxDayForMonth(monthStr: string, yearStr: string): number {
  const mIdx = MONTHS.indexOf(monthStr);
  if (mIdx === -1) return 31;
  // Use Date overflow trick: day 0 of next month = last day of current month
  const y = parseInt(yearStr, 10) || 2000;
  return new Date(y, mIdx + 1, 0).getDate();
}

/** Clamp a day string to the max valid day for the given month/year. */
function clampDay(dayStr: string, monthStr: string, yearStr: string): string {
  const d = parseInt(dayStr, 10) || 1;
  const max = maxDayForMonth(monthStr, yearStr);
  return Math.min(d, max).toString();
}

export default function ModernDatePicker({ visible, value, onClose, onApply, title = "Select Date" }: ModernDatePickerProps) {
  const [day, setDay] = useState('1');
  const [month, setMonth] = useState('Jan');
  const [year, setYear] = useState('2000');

  const dayRef = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const yearRef = useRef<ScrollView>(null);

  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  /** Scroll a ScrollView ref so that the item at `index` is centered in the selection band. */
  const scrollToIndex = useCallback((ref: React.RefObject<ScrollView | null>, index: number) => {
    if (index >= 0) {
      ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    }
  }, []);

  // When month or year changes, clamp the day if it exceeds the max for that month/year
  useEffect(() => {
    const clamped = clampDay(day, month, year);
    if (clamped !== day) {
      setDay(clamped);
      const dIdx = DAYS.indexOf(clamped);
      scrollToIndex(dayRef, dIdx);
    }
  }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible && value) {
      const parts = value.split(' ');
      if (parts.length === 3) {
        const parsedMonth = parts[1].replace('.', '');
        const parsedYear = parts[2];
        const parsedDay = clampDay(parts[0], parsedMonth, parsedYear);

        setDay(parsedDay);
        setMonth(parsedMonth); // strip period -- internal state uses "Dec" not "Dec."
        setYear(parsedYear);

        const timer = setTimeout(() => {
          const dIdx = DAYS.indexOf(parsedDay);
          const mIdx = MONTHS.indexOf(parsedMonth);
          const yIdx = YEARS.indexOf(parsedYear);

          if (dIdx !== -1) dayRef.current?.scrollTo({ y: dIdx * ITEM_HEIGHT, animated: false });
          if (mIdx !== -1) monthRef.current?.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: false });
          if (yIdx !== -1) yearRef.current?.scrollTo({ y: yIdx * ITEM_HEIGHT, animated: false });
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, value]);

  const handleApply = () => {
    // Final clamp before emitting — safety net
    const safeDay = clampDay(day, month, year);
    onApply(`${safeDay} ${month}. ${year}`); // always output "Dec." format to match stored data
    onClose();
  };

  const handleDaySelect = useCallback((val: string) => {
    setDay(val);
    const idx = DAYS.indexOf(val);
    scrollToIndex(dayRef, idx);
  }, [scrollToIndex]);

  const handleMonthSelect = useCallback((val: string) => {
    setMonth(val);
    const idx = MONTHS.indexOf(val);
    scrollToIndex(monthRef, idx);
  }, [scrollToIndex]);

  const handleYearSelect = useCallback((val: string) => {
    setYear(val);
    const idx = YEARS.indexOf(val);
    scrollToIndex(yearRef, idx);
  }, [scrollToIndex]);

  const renderColumn = (
    data: string[],
    selectedValue: string,
    onSelect: (val: string) => void,
    svRef: React.RefObject<ScrollView | null>,
  ) => {
    return (
      <View style={styles.columnContainer}>
        {/* Selection Indicator Mask */}
        <View style={styles.selectionMask} pointerEvents="none" />

        <ScrollView
          ref={svRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
            if (data[index]) {
              onSelect(data[index]);
            }
          }}
        >
          {data.map((item, i) => {
            const isSelected = item === selectedValue;
            return (
              <Pressable
                key={i}
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={60} tint="dark" style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar" size={20} color={Colors.goldLight} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.t2} />
            </Pressable>
          </View>

          <View style={styles.pickerMain}>
             {renderColumn(DAYS, day, handleDaySelect, dayRef)}
             {renderColumn(MONTHS, month, handleMonthSelect, monthRef)}
             {renderColumn(YEARS, year, handleYearSelect, yearRef)}
          </View>

          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.navy} />
            <Text style={styles.applyBtnText}>Confirm Date</Text>
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.b1, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.goldLight, letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },

  pickerMain: { flexDirection: 'row', height: ITEM_HEIGHT * 5, backgroundColor: Colors.bgElevated, borderRadius: 16, borderWidth: 1, borderColor: Colors.b1, overflow: 'hidden', marginBottom: 24 },
  columnContainer: { flex: 1, height: '100%', borderRightWidth: 1, borderRightColor: Colors.b1 },

  selectionMask: { position: 'absolute', top: ITEM_HEIGHT * 2, left: 0, right: 0, height: ITEM_HEIGHT, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', zIndex: -1 },

  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemSelected: { },
  itemText: { fontSize: 16, color: Colors.t3, fontWeight: '600' },
  itemTextSelected: { fontSize: 18, color: Colors.goldLight, fontWeight: '800' },

  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.goldLight, paddingVertical: 16, borderRadius: 14 },
  applyBtnText: { color: Colors.navy, fontSize: 16, fontWeight: '800' },
});
