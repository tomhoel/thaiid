import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

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

export default function ModernDatePicker({ visible, value, onClose, onApply, title = "Select Date" }: ModernDatePickerProps) {
  const [day, setDay] = useState('1');
  const [month, setMonth] = useState('Jan');
  const [year, setYear] = useState('2000');

  const dayRef = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const yearRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && value) {
      const parts = value.split(' ');
      if (parts.length === 3) {
        setDay(parts[0]);
        setMonth(parts[1]);
        setYear(parts[2]);

        setTimeout(() => {
          const dIdx = DAYS.indexOf(parts[0]);
          const mIdx = MONTHS.indexOf(parts[1]);
          const yIdx = YEARS.indexOf(parts[2]);

          if (dIdx !== -1) dayRef.current?.scrollTo({ y: dIdx * ITEM_HEIGHT, animated: false });
          if (mIdx !== -1) monthRef.current?.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: false });
          if (yIdx !== -1) yearRef.current?.scrollTo({ y: yIdx * ITEM_HEIGHT, animated: false });
        }, 50);
      }
    }
  }, [visible, value]);

  const handleApply = () => {
    onApply(`${day} ${month} ${year}`);
    onClose();
  };

  const renderColumn = (data: string[], selectedValue: string, onSelect: (val: string) => void, svRef: React.RefObject<ScrollView | null>) => {
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
             {renderColumn(DAYS, day, setDay, dayRef)}
             {renderColumn(MONTHS, month, setMonth, monthRef)}
             {renderColumn(YEARS, year, setYear, yearRef)}
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

const styles = StyleSheet.create({
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
