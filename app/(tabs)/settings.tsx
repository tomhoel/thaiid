import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Switch, Platform, TextInput, ScrollView, Modal, Image, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { CARD_TEMPLATE_BASE64 } from '../../src/constants/cardTemplate';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ModernDatePicker from '../../src/components/ModernDatePicker';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import { cardData as defaultCardData } from '../../src/constants/cardData';
import ScreenHeader from '../../src/components/ScreenHeader';
import GarudaEmblem from '../../src/components/GarudaEmblem';
import { useLang } from '../../src/i18n/LanguageContext';
import { useBiometric } from '../../src/context/BiometricContext';
import { useTheme } from '../../src/context/ThemeContext';
import Constants from 'expo-constants';

function Item({ icon, label, value, toggle, onToggle, last, onPress, colors, styles }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string;
  toggle?: boolean; onToggle?: (v: boolean) => void; last?: boolean;
  onPress?: () => void; colors: ColorPalette; styles: ReturnType<typeof makeStyles>;
}) {
  const handlePress = toggle !== undefined && onToggle
    ? () => onToggle(!toggle)
    : onPress;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!handlePress}
      style={({ pressed }) => [styles.item, last && styles.noBorder, pressed && styles.itemActive]}
    >
      <View style={styles.itemLabelRow}>
        <Ionicons name={icon} size={17} color={colors.t3} />
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      {toggle !== undefined ? (
        <View pointerEvents="none">
          <Switch
            value={toggle}
            onValueChange={onToggle}
            trackColor={{ false: colors.b2, true: colors.goldLight }}
            thumbColor="#fff"
            style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : undefined}
          />
        </View>
      ) : (
        <View style={styles.itemRight}>
          {value && <Text style={styles.itemVal}>{value}</Text>}
          <Ionicons name="chevron-forward" size={14} color={colors.t4} />
        </View>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { lang, toggle, t } = useLang();
  const { enabled: bio, setEnabled: setBio } = useBiometric();
  const { theme, toggleTheme, colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [notif, setNotif] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { profile: cardData, updateProfile, isGenerating, setGenerating } = useProfile();
  const [tempData, setTempData] = useState(cardData);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoMime, setSelectedPhotoMime] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  const handleOpenDemo = () => {
    setTempData(cardData);
    setSelectedPhoto(null);
    setSelectedPhotoMime(null);
    setShowDemoModal(true);
  };

  const handleDateChange = (formatted: string) => {
    if (showDatePicker === 'dob') setTempData({ ...tempData, dateOfBirth: formatted });
    if (showDatePicker === 'issue') setTempData({ ...tempData, dateOfIssue: formatted });
    if (showDatePicker === 'expiry') setTempData({ ...tempData, dateOfExpiry: formatted });
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
    updateProfile({ ...defaultCardData, pictureUri: cardData.pictureUri, cardFrontUri: undefined });
    setShowDemoModal(false);
  };

  const handleSaveGenerate = () => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      Alert.alert('Missing API Key', 'EXPO_PUBLIC_GEMINI_API_KEY is not set.');
      return;
    }

    const snap = { ...tempData };
    const photo = selectedPhoto;
    const photoMime = selectedPhotoMime;

    updateProfile({ ...snap });
    setShowDemoModal(false);
    setGenerating(true);

    (async () => {
      try {
        let finalPrompt = `Edit this ID card image. Replace the original text on the card with: Name (EN): ${snap.fullNameEnglish}, DOB: ${snap.dateOfBirth}, Issued Date: ${snap.dateOfIssue}, Expiry Date: ${snap.dateOfExpiry}. Ensure it seamlessly matches the ID card font, color, and style, blending perfectly without artifacts. Do not change the layout.`;

        let finalParts: any[] = [
          { inlineData: { mimeType: "image/png", data: CARD_TEMPLATE_BASE64 } }
        ];

        if (photo) {
          finalPrompt += ` Additionally, seamlessly replace the person's portrait face photo on the right side of the ID card with the SECOND provided image natively. You must meticulously merge the new face into the layout while keeping the background of the ID card intact, particularly the height/scale line measurements securely sitting behind the person on the card. Do not remove the ID card background.`;
          finalParts.push({ inlineData: { mimeType: photoMime || 'image/jpeg', data: photo } });
        }

        finalParts.push({ text: finalPrompt });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: "user", parts: finalParts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
            })
          }
        );
        const data = await response.json();

        if (!response.ok) {
          Alert.alert('Generation Failed', data.error?.message || `HTTP ${response.status}`);
          return;
        }

        let newCardFrontUri = snap.cardFrontUri;
        let newFaceUri: string | undefined = snap.pictureUri;

        if (data.candidates?.[0]?.content?.parts) {
          const inlinePart = data.candidates[0].content.parts.find((p: any) => p.inlineData);
          if (inlinePart?.inlineData?.data) {
            newCardFrontUri = `data:${inlinePart.inlineData.mimeType || 'image/png'};base64,${inlinePart.inlineData.data}`;
          }
        }

        const faceSource = photo
          ? { mimeType: photoMime || 'image/jpeg', data: photo }
          : newCardFrontUri
            ? { mimeType: newCardFrontUri.split(';')[0].split(':')[1], data: newCardFrontUri.split(',')[1] }
            : null;

        if (faceSource) {
          try {
            const faceResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [
                    { inlineData: faceSource },
                    { text: 'Create a clean passport-style portrait from this image. Crop tightly to the face and shoulders, center the face perfectly in the frame, and replace the entire background with a plain white background. Remove all text, watermarks, card elements, and any objects that are not the person. The face must be centered and fill most of the frame.' },
                  ]}],
                  generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
                }),
              }
            );
            const faceData = await faceResp.json();
            const facePart = faceData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (facePart?.inlineData?.data) {
              newFaceUri = `data:${facePart.inlineData.mimeType || 'image/png'};base64,${facePart.inlineData.data}`;
            }
          } catch {}
        }

        updateProfile({ cardFrontUri: newCardFrontUri, pictureUri: newFaceUri });
      } catch (err: any) {
        Alert.alert('Generation Failed', err?.message || String(err));
      } finally {
        setGenerating(false);
      }
    })();
  };

  return (
    <View style={styles.screen}>

      <ScreenHeader
        title={t('settings.title')}
        sub={lang === 'en' ? 'ตั้งค่าแอปพลิเคชัน' : 'Application Settings'}
      />

      {/* ── Profile — static, does not scroll ── */}
      <View style={styles.profileRow}>
        <View style={styles.profileAvatar}>
          {cardData.pictureUri ? (
            <Image source={{ uri: cardData.pictureUri }} style={styles.profileAvatarImg} resizeMode="cover" />
          ) : (
            <View style={styles.profileAvatarFallback}>
              <Text style={styles.profileAvatarInitials}>
                {cardData.firstName.charAt(0)}{cardData.lastName.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>
            {lang === 'en' ? cardData.fullNameEnglish : cardData.nameThai}
          </Text>
          <Text style={styles.profileSub}>
            {lang === 'en' ? cardData.nameThai : cardData.fullNameEnglish}
          </Text>
          <Text style={styles.profileId} numberOfLines={1}>{cardData.idNumber}</Text>
        </View>
      </View>

      <View style={styles.separator} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Security ── */}
        <Text style={styles.sectionLabel}>{t('settings.security')}</Text>
        <Item icon="finger-print-outline" label={t('settings.biometric')} toggle={bio} onToggle={setBio} colors={Colors} styles={styles} />
        <Item icon="lock-closed-outline" label={t('settings.pin')} colors={Colors} styles={styles} />
        <Item icon="eye-off-outline" label={t('settings.privacy')} last colors={Colors} styles={styles} />

        <View style={styles.gap} />

        {/* ── Preferences ── */}
        <Text style={styles.sectionLabel}>{t('settings.preferences')}</Text>
        <Item icon="notifications-outline" label={t('settings.notifications')} toggle={notif} onToggle={setNotif} colors={Colors} styles={styles} />
        <Item icon="language-outline" label={t('settings.language')} value={lang === 'en' ? 'English' : 'ไทย'} onPress={toggle} colors={Colors} styles={styles} />
        <Item icon={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} label={t('settings.theme')} value={theme === 'dark' ? 'Dark' : 'Light'} onPress={toggleTheme} colors={Colors} styles={styles} />
        <Item icon="build-outline" label="Demo Profile" onPress={handleOpenDemo} last colors={Colors} styles={styles} />

        <View style={styles.gap} />

        {/* ── System ── */}
        <Text style={styles.sectionLabel}>SYSTEM</Text>
        <Item icon="information-circle-outline" label="Application Version" value={Constants.expoConfig?.version ?? '1.0.0'} colors={Colors} styles={styles} />
        <Item icon="document-text-outline" label="Official Reference" value="TH-DPA-BORA" colors={Colors} styles={styles} />
        <Item icon="shield-checkmark-outline" label="Certification Status" value="Active" last colors={Colors} styles={styles} />

        <View style={styles.gap} />

        {/* ── Attribution ── */}
        <View style={styles.attribution}>
          <GarudaEmblem size={20} opacity={0.15} />
          <Text style={styles.attrThai}>กรมการปกครอง</Text>
          <Text style={styles.attrEng}>DEPARTMENT OF PROVINCIAL ADMINISTRATION</Text>
          <Text style={styles.attrMinistry}>MINISTRY OF INTERIOR · KINGDOM OF THAILAND</Text>
          <View style={styles.attrRule} />
          <Text style={styles.attrNote}>{'Authorized digital identification application\nสำหรับใช้งานอย่างเป็นทางการเท่านั้น'}</Text>
        </View>

      </ScrollView>

      {/* ── Demo Settings Modal ── */}
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
                    <TextInput
                      style={styles.inputField}
                      value={tempData.firstName}
                      onChangeText={v => setTempData({ ...tempData, firstName: v, fullNameEnglish: `Mr. ${v} ${tempData.lastName}` })}
                    />
                  </View>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Ionicons name="person-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      value={tempData.lastName}
                      onChangeText={v => setTempData({ ...tempData, lastName: v, fullNameEnglish: `Mr. ${tempData.firstName} ${v}` })}
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <Pressable onPress={() => setShowDatePicker('dob')}>
                    <View style={styles.inputWrap}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.t3} style={styles.inputIcon} />
                      <Text style={styles.inputField} numberOfLines={1}>{tempData.dateOfBirth}</Text>
                    </View>
                  </Pressable>
                </View>

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
              <Pressable style={[styles.saveBtn, isGenerating && { opacity: 0.5 }]} onPress={handleSaveGenerate} disabled={isGenerating}>
                <Ionicons name="color-wand" size={18} color={Colors.navy} />
                <Text style={styles.saveBtnText}>{isGenerating ? 'Generating…' : 'AI Generate'}</Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </Modal>

    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgCard },

  scroll: { paddingBottom: 100 },

  // ── Profile ──
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 18,
  },
  profileAvatar: {
    width: 46, height: 46, borderRadius: 23, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.goldBorder,
  },
  profileAvatarImg: { width: '100%', height: '100%' },
  profileAvatarFallback: {
    flex: 1, backgroundColor: C.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarInitials: { fontSize: 14, fontWeight: '700', color: C.goldLight },
  profileName: { fontSize: 14, fontWeight: '700', color: C.t1 },
  profileSub: { fontSize: 10, color: C.t3, marginTop: 1 },
  profileId: { fontSize: 9, color: C.t4, marginTop: 3, letterSpacing: 0.5 },

  separator: { height: 1, backgroundColor: C.b1 },
  gap: { height: 24 },

  // ── Section labels ──
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.t4,
    textTransform: 'uppercase', letterSpacing: 1.2,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
  },

  // ── Rows ──
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.b1,
  },
  noBorder: { borderBottomWidth: 0 },
  itemActive: { backgroundColor: C.bgSurface },
  itemLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemLabel: { fontSize: 14, fontWeight: '500', color: C.t1 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemVal: { fontSize: 13, color: C.t3 },

  // ── Attribution ──
  attribution: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, gap: 3 },
  attrThai: { fontSize: 11, fontWeight: '700', color: C.t4, letterSpacing: 0.5, marginTop: 8 },
  attrEng: { fontSize: 8.5, fontWeight: '700', color: C.t4, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 },
  attrMinistry: { fontSize: 8, color: C.t4, letterSpacing: 0.8, textTransform: 'uppercase' },
  attrRule: { height: 1, width: 48, backgroundColor: C.b1, marginVertical: 8 },
  attrNote: { fontSize: 9, color: C.t4, textAlign: 'center', letterSpacing: 0.3, lineHeight: 14 },

  // ── Modal ──
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 16 },
  modalContent: {
    backgroundColor: C.bgCard, borderRadius: 24, maxHeight: '85%',
    padding: 24, borderWidth: 1, borderColor: C.b1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 30, elevation: 15,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.goldLight, letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' },
  modalForm: { flexShrink: 1, marginBottom: 24 },
  formGap: { gap: 16 },

  inputLabel: { fontSize: 11, color: C.t3, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: C.b1, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  inputField: { flex: 1, paddingVertical: 14, color: C.t1, fontSize: 15, fontWeight: '600' },

  imagePickerBtn: { height: 110, backgroundColor: C.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: C.t4, borderStyle: 'dashed', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  imagePickerEmpty: { alignItems: 'center', gap: 6 },
  imagePickerText: { fontSize: 13, color: C.t3, fontWeight: '600' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  actionRow: { flexDirection: 'row', gap: 12 },
  revertBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.bgElevated, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: C.b1 },
  revertBtnText: { color: C.t1, fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.goldLight, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { color: C.navy, fontSize: 15, fontWeight: '800' },
});
