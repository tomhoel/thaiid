import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Switch, Platform, TextInput, ScrollView, Modal, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ModernDatePicker from '../../src/components/ModernDatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { cardData as defaultCardData } from '../../src/constants/cardData';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import { useLang } from '../../src/i18n/LanguageContext';
import { useBiometric } from '../../src/context/BiometricContext';

function Item({ icon, label, value, toggle, onToggle, last, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string;
  toggle?: boolean; onToggle?: (v: boolean) => void; last?: boolean; color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={toggle !== undefined && !onPress}
      style={({ pressed }) => [styles.item, last && styles.noBorder, pressed && !toggle && styles.itemActive]}
    >
      <View style={[styles.iconBox, { backgroundColor: (color || Colors.blue) + '1A' }]}>
        <Ionicons name={icon} size={14} color={color || Colors.blue} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
      {toggle !== undefined ? (
        <Switch value={toggle} onValueChange={onToggle}
          trackColor={{ false: Colors.t4, true: Colors.goldLight }}
          thumbColor="#fff"
          style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
        />
      ) : (
        <View style={styles.itemRight}>
          {value && <Text style={styles.itemVal}>{value}</Text>}
          <Ionicons name="chevron-forward" size={13} color={Colors.t4} />
        </View>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { lang, toggle, t } = useLang();
  const { enabled: bio, setEnabled: setBio } = useBiometric();
  const [notif, setNotif] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { profile: cardData, updateProfile } = useProfile();
  const [tempData, setTempData] = useState(cardData);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoMime, setSelectedPhotoMime] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null); // 'dob', 'issue', 'expiry'

  const handleOpenDemo = () => {
    setTempData(cardData);
    setSelectedPhoto(null);
    setSelectedPhotoMime(null);
    setShowDemoModal(true);
  };

  const handleDateChange = (formatted: string) => {
    if (showDatePicker === 'dob') setTempData({...tempData, dateOfBirth: formatted});
    if (showDatePicker === 'issue') setTempData({...tempData, dateOfIssue: formatted});
    if (showDatePicker === 'expiry') setTempData({...tempData, dateOfExpiry: formatted});
    setShowDatePicker(null);
  };

  const getDatePickerValue = () => {
    if (showDatePicker === 'dob') return tempData.dateOfBirth;
    if (showDatePicker === 'issue') return tempData.dateOfIssue;
    if (showDatePicker === 'expiry') return tempData.dateOfExpiry;
    return '1 Jan 2000';
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedPhoto(result.assets[0].base64);
      setSelectedPhotoMime(result.assets[0].mimeType || 'image/jpeg');
    }
  };

  const handleRevert = () => {
    updateProfile({ ...defaultCardData, pictureUri: undefined });
    setShowDemoModal(false);
  };

  const handleSaveGenerate = async () => {
    setIsGenerating(true);
    try {
      const apiKey = 'REDACTED_API_KEY';
      
      const assetUri = Image.resolveAssetSource(require('../../pics/1.png')).uri;
      const imgRes = await fetch(assetUri);
      const blob = await imgRes.blob();
      const base64Full = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64Data = base64Full.includes(',') ? base64Full.split(',')[1] : base64Full;

      let finalPrompt = `Edit this ID card image. Replace the original text on the card with: Name (EN): ${tempData.fullNameEnglish}, DOB: ${tempData.dateOfBirth}, Issued Date: ${tempData.dateOfIssue}, Expiry Date: ${tempData.dateOfExpiry}. Ensure it seamlessly matches the ID card font, color, and style, blending perfectly without artifacts. Do not change the layout.`;
      
      let finalParts: any[] = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        }
      ];

      if (selectedPhoto) {
         finalPrompt += ` Additionally, seamlessly replace the person's portrait face photo on the right side of the ID card with the SECOND provided image natively. You must meticulously merge the new face into the layout while keeping the background of the ID card intact, particularly the height/scale line measurements securely sitting behind the person on the card. Do not remove the ID card background.`;
         finalParts.push({
           inlineData: {
             mimeType: selectedPhotoMime || 'image/jpeg',
             data: selectedPhoto
           }
         });
      }

      finalParts.push({ text: finalPrompt });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: finalParts
          }],
          generationConfig: {
             responseModalities: ["IMAGE"]
          }
        })
      });
      const data = await response.json();

      let newPicUri = tempData.pictureUri;
      if (data.candidates && data.candidates[0].content.parts) {
        const parts = data.candidates[0].content.parts;
        const inlinePart = parts.find((p: any) => p.inlineData);
        if (inlinePart && inlinePart.inlineData.data) {
          const mime = inlinePart.inlineData.mimeType || 'image/png';
          newPicUri = `data:${mime};base64,${inlinePart.inlineData.data}`;
        } else {
             console.error("No inline data returned by Gemini:", data);
        }
      } else {
         console.error("Gemini Edit failed:", data);
      }

      updateProfile({ ...tempData, pictureUri: newPicUri });
    } catch (err) {
      console.error('Failed communicating with Gemini:', err);
      updateProfile(tempData); // Update text minimally if image fails
    } finally {
      setIsGenerating(false);
      setShowDemoModal(false);
    }
  };

  return (
    <View style={styles.screen}>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: top + 90, paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
      >

      {/* ── Profile ── */}
      <View style={styles.profile}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {cardData.firstName.charAt(0)}{cardData.lastName.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nameEn}>{lang === 'en' ? cardData.fullNameEnglish : cardData.nameThai}</Text>
          <Text style={styles.nameTh}>{lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish}</Text>
        </View>
      </View>

      {/* ── Security ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
        <View style={styles.sectionLine} />
      </View>
      <View style={styles.groupCard}>
        <Item icon="finger-print-outline" label={t('settings.biometric')} toggle={bio} onToggle={setBio} color={Colors.blue} />
        <Item icon="lock-closed-outline" label={t('settings.pin')} color={Colors.blue} />
        <Item icon="eye-off-outline" label={t('settings.privacy')} color={Colors.blue} last />
      </View>

      {/* ── Preferences ── */}
      <View style={[styles.sectionHeader, { marginTop: 14 }]}>
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
        <View style={styles.sectionLine} />
      </View>
      <View style={styles.groupCard}>
        <Item icon="notifications-outline" label={t('settings.notifications')} toggle={notif} onToggle={setNotif} color={Colors.orange} />
        <Item icon="language-outline" label={t('settings.language')} value={lang === 'en' ? 'English' : 'ไทย'} color={Colors.orange} onPress={toggle} />
        <Item icon="sunny-outline" label={t('settings.theme')} value={t('settings.dark')} color={Colors.orange} />
        <Item icon="build-outline" label="Demo Profile Settings" color={Colors.t4} onPress={handleOpenDemo} last />
      </View>

      {/* ── Demo Settings Popup ── */}
      <Modal visible={showDemoModal} animationType="fade" transparent>
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color={Colors.goldLight} />
                <Text style={styles.modalTitle}>Dynamic Persona</Text>
              </View>
              <Pressable onPress={() => setShowDemoModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.t2} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.formGap}>
                <View>
                  <Text style={styles.inputLabel}>New Portrait Photo (Optional)</Text>
                  <Pressable style={styles.imagePickerBtn} onPress={handlePickImage}>
                    {selectedPhoto ? (
                      <Image source={{ uri: `data:${selectedPhotoMime};base64,${selectedPhoto}` }} style={styles.imagePreview} />
                    ) : (
                      <View style={styles.imagePickerEmpty}>
                        <Ionicons name="camera-outline" size={32} color={Colors.t3} />
                        <Text style={styles.imagePickerText}>Select Portrait</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={[styles.inputLabel, { flex: 1 }]}>First Name (EN)</Text>
                  <Text style={[styles.inputLabel, { flex: 1 }]}>Last Name (EN)</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: -6 }}>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Ionicons name="person-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                    <TextInput style={styles.inputField} value={tempData.firstName} onChangeText={t => setTempData({...tempData, firstName: t, fullNameEnglish: `Mr. ${t} ${tempData.lastName}`})} />
                  </View>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Ionicons name="person-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                    <TextInput style={styles.inputField} value={tempData.lastName} onChangeText={t => setTempData({...tempData, lastName: t, fullNameEnglish: `Mr. ${tempData.firstName} ${t}`})} />
                  </View>
                </View>

                {/* DOB Full Width */}
                <View>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <Pressable onPress={() => setShowDatePicker('dob')}>
                    <View style={styles.inputWrap}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                      <Text style={styles.inputField} numberOfLines={1}>{tempData.dateOfBirth}</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Issued & Expires Inline (2 Columns) */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Issued Date</Text>
                    <Pressable onPress={() => setShowDatePicker('issue')}>
                      <View style={styles.inputWrap}>
                        <Ionicons name="time-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                        <Text style={styles.inputField} numberOfLines={1}>{tempData.dateOfIssue}</Text>
                      </View>
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Expiry Date</Text>
                    <Pressable onPress={() => setShowDatePicker('expiry')}>
                      <View style={styles.inputWrap}>
                        <Ionicons name="hourglass-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                        <Text style={styles.inputField} numberOfLines={1}>{tempData.dateOfExpiry}</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>

            {showDatePicker && (
              <ModernDatePicker
                visible={!!showDatePicker}
                value={getDatePickerValue()}
                title={showDatePicker === 'dob' ? 'Date of Birth' : showDatePicker === 'issue' ? 'Issued Date' : 'Expiry Date'}
                onClose={() => setShowDatePicker(null)}
                onApply={handleDateChange}
              />
            )}

            <View style={styles.actionRow}>
              <Pressable style={styles.revertBtn} onPress={handleRevert} disabled={isGenerating}>
                <Ionicons name="refresh" size={18} color={Colors.t2} />
                <Text style={styles.revertBtnText}>Default</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveGenerate} disabled={isGenerating}>
                {isGenerating ? <ActivityIndicator color="#0C1526" /> : (
                  <>
                    <Ionicons name="color-wand" size={18} color={Colors.navy} />
                    <Text style={styles.saveBtnText}>AI Generate</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </BlurView>
      </Modal>

      </ScrollView>

      {/* ── Header Overlay (Gradient) ── */}
      <LinearGradient
        colors={[Colors.bg, Colors.bg, 'transparent']}
        locations={[0, 0.65, 1]}
        style={[styles.headerGradient, { paddingTop: top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerBanner}>
          <View style={styles.headerLeft}>
            <GarudaEmblem size={32} />
            <View>
              <Text style={styles.headerTitle}>{t('settings.title')}</Text>
              <Text style={styles.headerSub}>{lang === 'en' ? 'ตั้งค่าแอปพลิเคชัน' : 'Application Settings'}</Text>
            </View>
          </View>
          <Pressable style={styles.langSwitch} onPress={toggle}>
            <Text style={[styles.langLabel, lang === 'en' && styles.langActive]}>EN</Text>
            <View style={styles.langDot} />
            <Text style={[styles.langLabel, lang === 'th' && styles.langActive]}>TH</Text>
          </Pressable>
        </View>
      </LinearGradient>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },

  // Header overlay
  headerGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingBottom: 28, // fade extension
    zIndex: 10,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.t1, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, color: Colors.t4, marginTop: 1 },
  langSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  langLabel: { fontSize: 12, fontWeight: '700', color: Colors.t4 },
  langActive: { color: Colors.goldLight },
  langDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.t4 },

  // Profile — matches identity cardholder style
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.b1,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.goldBg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: Colors.goldLight },
  nameEn: { fontSize: 14, fontWeight: '700', color: Colors.t1 },
  nameTh: { fontSize: 10, color: Colors.t4, marginTop: 1 },

  // Section header — identical to Identity tab
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.b1, marginLeft: 6 },

  // Group card
  groupCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.b1,
  },
  noBorder: { borderBottomWidth: 0 },
  itemActive: { backgroundColor: Colors.bgSurface },
  iconBox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.t1 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  itemVal: { fontSize: 11, color: Colors.t3 },

  // Modal styling (premium modern approach)
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: Colors.bgCard, borderRadius: 24, maxHeight: '85%', padding: 24, borderWidth: 1, borderColor: Colors.b1, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.goldLight, letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  modalForm: { flexShrink: 1, marginBottom: 24 },
  formGap: { gap: 16 },
  
  inputLabel: { fontSize: 11, color: Colors.t3, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: Colors.b1, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  inputField: { flex: 1, paddingVertical: 14, color: Colors.t1, fontSize: 15, fontWeight: '600' },
  
  imagePickerBtn: { height: 110, backgroundColor: Colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: Colors.t4, borderStyle: 'dashed', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  imagePickerEmpty: { alignItems: 'center', gap: 6 },
  imagePickerText: { fontSize: 13, color: Colors.t3, fontWeight: '600' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  actionRow: { flexDirection: 'row', gap: 12 },
  revertBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.bgElevated, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: Colors.b1 },
  revertBtnText: { color: Colors.t1, fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.goldLight, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { color: Colors.navy, fontSize: 15, fontWeight: '800' },
});
