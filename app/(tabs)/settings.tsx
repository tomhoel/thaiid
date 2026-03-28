import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Switch, Platform, TextInput, ScrollView, Modal, Image, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ModernDatePicker from '../../src/components/ModernDatePicker';
import { type ColorPalette } from '../../src/constants/colors';
import { useProfile } from '../../src/context/ProfileContext';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useLang } from '../../src/i18n/LanguageContext';
import { useBiometric } from '../../src/context/BiometricContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useCountry } from '../../src/context/CountryContext';
import NationalEmblem from '../../src/components/NationalEmblem';
import BackgroundAtmosphere from '../../src/components/BackgroundAtmosphere';
import Constants from 'expo-constants';
import { setAppIcon } from '../../src/modules/DynamicIcon';
import { saveCardImage, savePortraitImage, clearCardImages } from '../../src/utils/cardImageStore';
import { saveVersion, findMatchingVersion, clearAllHistory } from '../../src/utils/versionHistory';

function getCardTemplate(countryCode: string): string {
  switch (countryCode) {
    case 'SG': return require('../../src/constants/sgCardTemplate').SG_CARD_TEMPLATE_BASE64;
    case 'BR': return require('../../src/constants/brCardTemplate').BR_CARD_TEMPLATE_BASE64;
    case 'US': return require('../../src/constants/usCardTemplate').US_CARD_TEMPLATE_BASE64;
    case 'VN': return require('../../src/constants/vnCardTemplate').VN_CARD_TEMPLATE_BASE64;
    default: return require('../../src/constants/cardTemplate').CARD_TEMPLATE_BASE64;
  }
}

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
  const { lang, setLang, t } = useLang();
  const { country, config, setCountry } = useCountry();
  const { enabled: bio, setEnabled: setBio } = useBiometric();
  const { theme, setTheme, colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [syncAll, setSyncAll] = useState(false);
  const [notif, setNotif] = useState(true);

  // Load persisted preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedNotif, savedSync] = await Promise.all([
          AsyncStorage.getItem('@notifications'),
          AsyncStorage.getItem('@sync_all'),
        ]);
        if (savedNotif !== null) setNotif(savedNotif === 'true');
        if (savedSync !== null) setSyncAll(savedSync === 'true');
      } catch (e) { console.warn('[Settings] load prefs', e); }
    })();
  }, []);

  const handleToggleNotif = async (v: boolean) => {
    setNotif(v);
    try { await AsyncStorage.setItem('@notifications', String(v)); } catch {}
  };

  const handleToggleSyncAll = async (v: boolean) => {
    setSyncAll(v);
    try { await AsyncStorage.setItem('@sync_all', String(v)); } catch {}
  };
  const [picker, setPicker] = useState<{ title: string; options: { key: string; label: string; icon?: string }[]; selected: string; onSelect: (key: string) => void } | null>(null);
  const { profile: cardData, updateProfile, isGenerating, setGenerating, setGeneratingCountries, clearGeneratingCountry } = useProfile();
  const cardDataRef = useRef(cardData);
  useEffect(() => { cardDataRef.current = cardData; }, [cardData]);
  const [tempData, setTempData] = useState(cardData);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoMime, setSelectedPhotoMime] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  const handleOpenDemo = () => {
    setTempData(cardData);
    setShowDemoModal(true);
  };

  const handleDateChange = (formatted: string) => {
    const thai = config.dateFormat.toLocal(formatted);
    if (showDatePicker === 'dob') setTempData(prev => ({ ...prev, dateOfBirth: formatted, dateOfBirthThai: thai }));
    if (showDatePicker === 'issue') setTempData(prev => ({ ...prev, dateOfIssue: formatted, dateOfIssueThai: thai }));
    if (showDatePicker === 'expiry') setTempData(prev => ({ ...prev, dateOfExpiry: formatted, dateOfExpiryThai: thai }));
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

  // Sync shared fields to all other countries
  const syncSharedToOthers = async (updates: Record<string, any>) => {
    if (!syncAll) return;
    const sharedKeys = ['dateOfBirth', 'dateOfBirthThai', 'dateOfIssue', 'dateOfIssueThai', 'dateOfExpiry', 'dateOfExpiryThai', 'pictureUri'];
    const shared: Record<string, any> = {};
    for (const k of sharedKeys) {
      if (k in updates) shared[k] = updates[k];
    }
    if (Object.keys(shared).length === 0) return;
    const allCodes = ['TH', 'SG', 'BR', 'US', 'VN'];
    const configs: Record<string, any> = {
      TH: require('../../src/countries/thailand').THAILAND_CONFIG,
      SG: require('../../src/countries/singapore').SINGAPORE_CONFIG,
      BR: require('../../src/countries/brazil').BRAZIL_CONFIG,
      US: require('../../src/countries/usa').USA_CONFIG,
    };
    for (const code of allCodes) {
      if (code === country) continue;
      const key = `profile_data_${code}`;
      try {
        const targetConfig = configs[code];
        const saved = await AsyncStorage.getItem(key);
        // Use saved profile or defaults if country hasn't been visited yet
        const other = saved ? JSON.parse(saved) : { ...targetConfig.defaultCardData };
        // Convert dates to the target country's local format
        const converted = { ...shared };
        if (converted.dateOfBirth) converted.dateOfBirthThai = targetConfig.dateFormat.toLocal(converted.dateOfBirth);
        if (converted.dateOfIssue) converted.dateOfIssueThai = targetConfig.dateFormat.toLocal(converted.dateOfIssue);
        if (converted.dateOfExpiry) converted.dateOfExpiryThai = targetConfig.dateFormat.toLocal(converted.dateOfExpiry);
        await AsyncStorage.setItem(key, JSON.stringify({ ...other, ...converted }));
      } catch (e) { console.warn('[Sync]', e); }
    }
  };

  const handleRevert = async () => {
    // Clear saved card image files and version history
    await clearCardImages().catch(console.warn);
    await clearAllHistory().catch(console.warn);
    // Reset current country
    updateProfile({ ...config.defaultCardData, cardFrontUri: undefined, pictureUri: config.defaultCardData.pictureUri });

    // Reset all other countries too
    const allCodes = ['TH', 'SG', 'BR', 'US', 'VN'];
    const configs: Record<string, any> = {
      TH: require('../../src/countries/thailand').THAILAND_CONFIG,
      SG: require('../../src/countries/singapore').SINGAPORE_CONFIG,
      BR: require('../../src/countries/brazil').BRAZIL_CONFIG,
      US: require('../../src/countries/usa').USA_CONFIG,
    };
    for (const code of allCodes) {
      if (code === country) continue;
      const key = `profile_data_${code}`;
      const defaults = configs[code].defaultCardData;
      await AsyncStorage.setItem(key, JSON.stringify({ ...defaults })).catch(console.warn);
    }

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
    const { pictureUri: _p, cardFrontUri: _c, ...snapWithoutImages } = snap;
    setShowDemoModal(false);
    // Mark current country + all synced countries as generating
    setGenerating(true);
    if (syncAll) setGeneratingCountries(['TH', 'SG', 'BR', 'US', 'VN']);

    (async () => {
      try {
        // Check if we already have a cached version for this exact config
        const cached = await findMatchingVersion(country, snap);
        if (cached && !photo) {
          // Instant restore — no API call needed
          updateProfile({
            ...snap,
            cardFrontUri: cached.cardImageUri,
            ...(cached.portraitUri ? { pictureUri: cached.portraitUri } : {}),
          });
          clearGeneratingCountry(country);
          setGenerating(false);
          if (syncAll) ['TH', 'SG', 'BR', 'US', 'VN'].forEach(c => clearGeneratingCountry(c));
          return;
        }

        const savedData = cardDataRef.current;
        const hasTextChanges =
          snap.fullNameEnglish !== savedData.fullNameEnglish ||
          snap.dateOfBirth !== savedData.dateOfBirth ||
          snap.dateOfIssue !== savedData.dateOfIssue ||
          snap.dateOfExpiry !== savedData.dateOfExpiry;

        // Helper: call Gemini with retry on rate limit
        const callGemini = async (parts: any[], attempt = 1): Promise<any> => {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
            {
              method: 'POST',
              headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
              }),
            }
          );
          const json = await resp.json();
          if (!resp.ok) {
            const errMsg = json.error?.message || `HTTP ${resp.status}`;
            const errCode = json.error?.code || resp.status;
            console.warn(`[Gemini] Error ${errCode} (attempt ${attempt}):`, errMsg);
            // API key or auth errors — no point retrying
            if (resp.status === 401 || resp.status === 403 || errMsg.includes('API_KEY')) {
              throw new Error('Gemini API key is invalid or expired. Please rebuild the app with a valid key.');
            }
            if (attempt < 3 && (resp.status === 429 || resp.status >= 500)) {
              const delay = resp.status === 429 ? 5000 * attempt : 2000 * attempt;
              console.log(`[Gemini] Retrying in ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
              return callGemini(parts, attempt + 1);
            }
            throw new Error(errMsg);
          }
          return json;
        };

        const extractImageUri = (data: any): string | null => {
          const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
          if (part?.inlineData?.data) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          return null;
        };

        // If user picked a photo, use it directly as the portrait (no face extraction needed)
        // If no photo, keep the existing portrait
        const portraitUri = photo
          ? `data:${photoMime || 'image/jpeg'};base64,${photo}`
          : snap.pictureUri;

        // Build card generation parts for a given country
        // Always uses the clean template + photo (if available) for consistent quality
        const buildCardParts = (
          templateBase64: string,
          targetConfig: Record<string, any>,
          profileData: Record<string, any>,
        ) => {
          const hasPhoto = !!photo;
          const cardDesc = targetConfig.cardDescription;
          const parts: any[] = [{ inlineData: { mimeType: 'image/png', data: templateBase64 } }];

          // Always include the photo if available — ensures consistent portrait across edits
          if (hasPhoto) {
            parts.push({ inlineData: { mimeType: photoMime || 'image/jpeg', data: photo } });
          }

          const aspectNote = `The output image MUST be exactly the same dimensions and aspect ratio as the input image (1013x638 pixels, landscape). Do NOT change the canvas size, crop, pad, or reshape the image in any way.`;

          let prompt: string;
          if (hasPhoto) {
            prompt = `Edit this ${cardDesc} image.

${aspectNote}

Make these specific changes ONLY — do NOT move, resize, or reposition any element:
1. Replace the portrait photograph (keep it in the EXACT same position and size) with the person from the SECOND image, cropped to fit naturally.
2. Replace ONLY these text fields — match the EXACT original font, size, weight, color, and position:
   - English name: ${profileData.fullNameEnglish}
   - Date of Birth: ${profileData.dateOfBirth}
   - Date of Issue: ${profileData.dateOfIssue}
   - Date of Expiry: ${profileData.dateOfExpiry}
CRITICAL: The layout must remain IDENTICAL. All other text, numbers, logos, emblems, background patterns, gradient, chip, photo position, and other elements must remain COMPLETELY UNCHANGED. Do not redraw, move, or re-render any element that is not listed above.`;
          } else {
            prompt = `Edit this ${cardDesc} image.

${aspectNote}

Replace ONLY these text fields — match the EXACT original font, size, weight, color, and position:
   - English name: ${profileData.fullNameEnglish}
   - Date of Birth: ${profileData.dateOfBirth}
   - Date of Issue: ${profileData.dateOfIssue}
   - Date of Expiry: ${profileData.dateOfExpiry}
CRITICAL: The layout must remain IDENTICAL. Everything else must remain PIXEL-PERFECT — portrait photo, all other text, ID number, emblems, background, chip, patterns, positions. Only the 4 text fields listed above should change.`;
          }
          parts.push({ text: prompt });
          return parts;
        };

        // ── Generate ALL countries in parallel ──
        const allCodes = ['TH', 'SG', 'BR', 'US', 'VN'];
        const allConfigs: Record<string, any> = {
          TH: require('../../src/countries/thailand').THAILAND_CONFIG,
          SG: require('../../src/countries/singapore').SINGAPORE_CONFIG,
          BR: require('../../src/countries/brazil').BRAZIL_CONFIG,
          US: require('../../src/countries/usa').USA_CONFIG,
          VN: require('../../src/countries/vietnam').VIETNAM_CONFIG,
        };

        // ── Save portrait FIRST so all countries share the same file ──
        let portraitFileUri = portraitUri;
        if (portraitUri?.startsWith('data:')) {
          portraitFileUri = await savePortraitImage(country, portraitUri);
        }

        // Sync portrait + dates to all other countries BEFORE generation starts
        if (portraitFileUri) {
          await syncSharedToOthers({ ...snapWithoutImages, pictureUri: portraitFileUri });
        }

        // Current country generation
        const currentGen = (async () => {
          const parts = buildCardParts(
            getCardTemplate(country),
            config,
            snap,
          );
          const data = await callGemini(parts);
          const rawCardUri = extractImageUri(data);

          let cardFileUri = snap.cardFrontUri;
          if (rawCardUri) cardFileUri = await saveCardImage(country, rawCardUri);

          updateProfile({ cardFrontUri: cardFileUri, pictureUri: portraitFileUri });
          // Save to version history
          if (cardFileUri) saveVersion(country, snap, cardFileUri, portraitFileUri).catch(console.warn);
          clearGeneratingCountry(country);
        })();

        // Other countries generation — read profile AFTER sync so data is fresh
        const otherGens = syncAll ? allCodes
          .filter(c => c !== country)
          .map((code) => (async () => {
            const targetConfig = allConfigs[code];
            const targetKey = `profile_data_${code}`;
            // Re-read from AsyncStorage AFTER syncSharedToOthers has written updated data
            const savedRaw = await AsyncStorage.getItem(targetKey);
            const targetProfile = savedRaw ? JSON.parse(savedRaw) : { ...targetConfig.defaultCardData };

            const parts = buildCardParts(
              getCardTemplate(code),
              targetConfig,
              targetProfile,
            );
            console.log(`[SyncGen:${code}] Generating with DOB=${targetProfile.dateOfBirth}`);
            const genData = await callGemini(parts);
            const rawUri = extractImageUri(genData);
            if (rawUri) {
              const fileUri = await saveCardImage(code, rawUri);
              console.log(`[SyncGen:${code}] Success`);
              // Re-read profile to avoid clobbering portrait written by sync
              const freshRaw = await AsyncStorage.getItem(targetKey);
              const freshProfile = freshRaw ? JSON.parse(freshRaw) : targetProfile;
              await AsyncStorage.setItem(targetKey, JSON.stringify({ ...freshProfile, cardFrontUri: fileUri }));
              // Save to version history
              saveVersion(code, targetProfile, fileUri, portraitFileUri).catch(console.warn);
            } else {
              console.warn(`[SyncGen:${code}] No image returned`);
            }
            clearGeneratingCountry(code);
          })().catch(e => {
            console.warn(`[SyncGen:${code}] FAILED:`, e?.message || e);
            clearGeneratingCountry(code);
          }))
          : [];

        // Wait for ALL to complete
        await Promise.all([currentGen, ...otherGens]);

      } catch (err: any) {
        Alert.alert('Generation Failed', err?.message || String(err));
      } finally {
        // Safety net: clear all generating flags
        setGenerating(false);
        ['TH', 'SG', 'BR', 'US', 'VN'].forEach(c => clearGeneratingCountry(c));
      }
    })();
  };

  return (
    <View style={styles.screen}>

      <BackgroundAtmosphere tintCenter={0.3} />

      <ScreenHeader
        title={t('settings.title')}
        sub={lang === 'en' ? t('settings.subNative') : 'Application Settings'}
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
        <Item icon="lock-closed-outline" label={t('settings.pin')} onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available.')} colors={Colors} styles={styles} />
        <Item icon="eye-off-outline" label={t('settings.privacy')} last onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available.')} colors={Colors} styles={styles} />

        <View style={styles.gap} />

        {/* ── Preferences ── */}
        <Text style={styles.sectionLabel}>{t('settings.preferences')}</Text>
        <Item icon="notifications-outline" label={t('settings.notifications')} toggle={notif} onToggle={handleToggleNotif} colors={Colors} styles={styles} />
        <Item icon="language-outline" label={t('settings.language')} value={lang === 'en' ? 'English' : config.secondaryLanguage.langName} onPress={() => setPicker({
          title: 'Language',
          options: [
            { key: 'en', label: 'English' },
            { key: config.secondaryLanguage.code, label: config.secondaryLanguage.langName },
          ],
          selected: lang,
          onSelect: (k) => { setLang(k); setPicker(null); },
        })} colors={Colors} styles={styles} />
        <Item icon="globe-outline" label={t('settings.country')} value={config.name.english} onPress={() => setPicker({
          title: 'Country',
          options: [
            { key: 'TH', label: 'Thailand' },
            { key: 'SG', label: 'Singapore' },
            { key: 'BR', label: 'Brazil' },
            { key: 'US', label: 'New York City' },
            { key: 'VN', label: 'Vietnam' },
          ],
          selected: country,
          onSelect: (k) => { setCountry(k as any); setAppIcon(k); setPicker(null); },
        })} colors={Colors} styles={styles} />
        <Item icon={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} label={t('settings.theme')} value={theme === 'dark' ? 'Dark' : 'Light'} onPress={() => setPicker({
          title: 'Theme',
          options: [
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ],
          selected: theme,
          onSelect: (k) => { setTheme(k as any); setPicker(null); },
        })} colors={Colors} styles={styles} />
        <Item icon="build-outline" label="Demo Profile" onPress={handleOpenDemo} last colors={Colors} styles={styles} />

        <View style={styles.gap} />

        {/* ── System ── */}
        <Text style={styles.sectionLabel}>SYSTEM</Text>
        <Item icon="information-circle-outline" label="Application Version" value={Constants.expoConfig?.version ?? '1.0.0'} colors={Colors} styles={styles} />
        <Item icon="document-text-outline" label="Official Reference" value={config.systemReference} colors={Colors} styles={styles} />
        <Item icon="shield-checkmark-outline" label="Certification Status" value="Active" last colors={Colors} styles={styles} />

        <View style={styles.gap} />

        {/* ── Attribution ── */}
        <View style={styles.attribution}>
          <NationalEmblem size={20} opacity={0.15} />
          <Text style={styles.attrThai}>{config.issuer.primary}</Text>
          <Text style={styles.attrEng}>{t('attribution.dept')}</Text>
          <Text style={styles.attrMinistry}>{config.ministry}</Text>
          <View style={styles.attrRule} />
          <Text style={styles.attrNote}>{t('attribution.note')}</Text>
        </View>

      </ScrollView>

      {/* ── Demo Settings Modal ── */}
      <Modal visible={showDemoModal} animationType="fade" transparent>
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            {/* ── Header with close ── */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <NationalEmblem size={22} opacity={0.85} />
                <View>
                  <Text style={styles.modalHeaderTitle}>Dynamic Persona</Text>
                  <Text style={styles.modalHeaderSub}>{config.name.english}</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowDemoModal(false)} style={styles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={18} color={Colors.t3} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>

              {/* ═══ PHOTO + DATES ═══ */}
              <View style={styles.mSectionHeader}>
                <Ionicons name="globe-outline" size={11} color={Colors.goldLight} />
                <Text style={styles.mSectionLabel}>SHARED ACROSS COUNTRIES</Text>
              </View>

              {/* Portrait row */}
              <View style={styles.portraitRow}>
                <Pressable style={styles.portraitBox} onPress={handlePickImage}>
                  {selectedPhoto ? (
                    <Image source={{ uri: `data:${selectedPhotoMime};base64,${selectedPhoto}` }} style={styles.portraitImg} />
                  ) : cardData.pictureUri ? (
                    <Image source={{ uri: cardData.pictureUri }} style={styles.portraitImg} />
                  ) : (
                    <View style={styles.portraitEmpty}>
                      <Ionicons name="camera" size={20} color={Colors.goldLight} />
                    </View>
                  )}
                  <View style={styles.portraitBadge}>
                    <Ionicons name="pencil" size={8} color={Colors.navy} />
                  </View>
                </Pressable>
                <View style={styles.portraitMeta}>
                  <Text style={styles.portraitLabel}>Portrait Photo</Text>
                  <Text style={styles.portraitHint}>Tap to change</Text>
                </View>
              </View>

              {/* Date fields */}
              <View style={styles.dateSection}>
                <Pressable style={styles.dateRow} onPress={() => setShowDatePicker('dob')}>
                  <View style={styles.dateRowLeft}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.t3} />
                    <Text style={styles.dateRowLabel}>Date of Birth</Text>
                  </View>
                  <View style={styles.dateRowRight}>
                    <Text style={styles.dateRowValue}>{tempData.dateOfBirth}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.t4} />
                  </View>
                </Pressable>
                <View style={styles.dateDivider} />
                <Pressable style={styles.dateRow} onPress={() => setShowDatePicker('issue')}>
                  <View style={styles.dateRowLeft}>
                    <Ionicons name="ribbon-outline" size={16} color={Colors.t3} />
                    <Text style={styles.dateRowLabel}>Date of Issue</Text>
                  </View>
                  <View style={styles.dateRowRight}>
                    <Text style={styles.dateRowValue}>{tempData.dateOfIssue}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.t4} />
                  </View>
                </Pressable>
                <View style={styles.dateDivider} />
                <Pressable style={styles.dateRow} onPress={() => setShowDatePicker('expiry')}>
                  <View style={styles.dateRowLeft}>
                    <Ionicons name="time-outline" size={16} color={Colors.t3} />
                    <Text style={styles.dateRowLabel}>Date of Expiry</Text>
                  </View>
                  <View style={styles.dateRowRight}>
                    <Text style={styles.dateRowValue}>{tempData.dateOfExpiry}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.t4} />
                  </View>
                </Pressable>
              </View>

              {/* Sync toggle */}
              <Pressable style={styles.syncToggle} onPress={() => handleToggleSyncAll(!syncAll)}>
                <View style={[styles.syncDot, syncAll && { backgroundColor: Colors.goldLight }]} />
                <Text style={[styles.syncLabel, syncAll && { color: Colors.t1 }]}>Apply changes to all countries</Text>
                <Switch
                  value={syncAll}
                  onValueChange={handleToggleSyncAll}
                  trackColor={{ false: Colors.b2, true: Colors.goldLight }}
                  thumbColor="#fff"
                  style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
                />
              </Pressable>

              {/* ═══ DIVIDER ═══ */}
              <View style={styles.garudaDivider}>
                <View style={styles.divLine} />
                <NationalEmblem size={12} opacity={0.2} />
                <View style={styles.divLine} />
              </View>

              {/* ═══ COUNTRY-SPECIFIC ═══ */}
              <View style={styles.mSectionHeader}>
                <Ionicons name="flag-outline" size={11} color={Colors.goldLight} />
                <Text style={styles.mSectionLabel}>{config.name.english} ONLY</Text>
              </View>

              <View style={styles.nameFields}>
                <View style={styles.nameField}>
                  <Text style={styles.nameFieldLabel}>FIRST NAME</Text>
                  <TextInput
                    style={styles.nameFieldInput}
                    value={tempData.firstName}
                    onChangeText={v => setTempData({ ...tempData, firstName: v, fullNameEnglish: `${tempData.namePrefix || 'Mr.'} ${v} ${tempData.lastName}` })}
                    placeholderTextColor={Colors.t4}
                  />
                </View>
                <View style={styles.nameFieldDivider} />
                <View style={styles.nameField}>
                  <Text style={styles.nameFieldLabel}>LAST NAME</Text>
                  <TextInput
                    style={styles.nameFieldInput}
                    value={tempData.lastName}
                    onChangeText={v => setTempData({ ...tempData, lastName: v, fullNameEnglish: `${tempData.namePrefix || 'Mr.'} ${tempData.firstName} ${v}` })}
                    placeholderTextColor={Colors.t4}
                  />
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

            {/* ── Actions ── */}
            <View style={styles.actionRow}>
              <Pressable style={({ pressed }) => [styles.revertBtn, pressed && { opacity: 0.7 }]} onPress={handleRevert} disabled={isGenerating}>
                <Ionicons name="arrow-undo" size={16} color={Colors.t2} />
                <Text style={styles.revertBtnText}>Reset</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveBtn, isGenerating && { opacity: 0.5 }, pressed && !isGenerating && { opacity: 0.85 }]}
                onPress={handleSaveGenerate}
                disabled={isGenerating}
              >
                <Ionicons name={isGenerating ? 'hourglass-outline' : 'sparkles'} size={16} color={Colors.navy} />
                <Text style={styles.saveBtnText}>{isGenerating ? 'Generating…' : 'AI Generate'}</Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ── Option Picker Modal ── */}
      <Modal visible={!!picker} animationType="fade" transparent onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPicker(null)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{picker?.title}</Text>
            <View style={styles.pickerDivider} />
            {picker?.options.map(opt => (
              <Pressable
                key={opt.key}
                style={[styles.pickerOption, opt.key === picker.selected && styles.pickerOptionActive]}
                onPress={() => picker.onSelect(opt.key)}
              >
                <Text style={[styles.pickerOptionText, opt.key === picker.selected && styles.pickerOptionTextActive]}>
                  {opt.label}
                </Text>
                {opt.key === picker.selected && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.goldLight} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
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
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: C.bgCard, borderRadius: 14, maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.navy,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45, shadowRadius: 24, elevation: 16,
  },

  // Modal header
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.b2,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalHeaderTitle: { fontSize: 15, fontWeight: '800', color: C.t1, letterSpacing: -0.2 },
  modalHeaderSub: { fontSize: 9, color: C.t4, letterSpacing: 0.5, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bgSurface, alignItems: 'center', justifyContent: 'center',
  },

  // Form
  modalForm: { flexShrink: 1 },

  // Section headers
  mSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  mSectionLabel: { fontSize: 8.5, fontWeight: '800', color: C.goldLight, letterSpacing: 1.5 },

  // Portrait row
  portraitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  portraitMeta: { gap: 2 },
  portraitLabel: { fontSize: 13, fontWeight: '600', color: C.t1 },
  portraitHint: { fontSize: 10, color: C.t4 },
  portraitBox: {
    width: 72, height: 90, borderRadius: 6, overflow: 'hidden',
    backgroundColor: C.bgSurface,
    borderWidth: 1, borderColor: C.goldBorder,
  },
  portraitImg: { width: '100%', height: '100%' },
  portraitEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.goldBg,
  },
  portraitBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.goldLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Field label (reused in date picker context)
  fieldLabel: {
    fontSize: 7.5, fontWeight: '700', color: C.t4,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3,
  },

  // Garuda divider
  // Date rows — settings-style list
  dateSection: {
    marginHorizontal: 16, borderRadius: 10,
    backgroundColor: C.bgSurface, overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, minHeight: 46,
  },
  dateRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateRowLabel: { fontSize: 13, fontWeight: '500', color: C.t1 },
  dateRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateRowValue: { fontSize: 13, fontWeight: '600', color: C.t2 },
  dateDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.b1, marginLeft: 40 },

  // Sync toggle
  syncToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, backgroundColor: C.bgSurface,
  },
  syncDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.t4,
  },
  syncLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: C.t3 },

  // Name fields — card-style
  nameFields: {
    marginHorizontal: 16, borderRadius: 10,
    backgroundColor: C.bgSurface, overflow: 'hidden',
  },
  nameField: { paddingHorizontal: 14, paddingVertical: 10 },
  nameFieldLabel: {
    fontSize: 8, fontWeight: '700', color: C.t4,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  nameFieldInput: { fontSize: 15, fontWeight: '600', color: C.t1, paddingVertical: 2 },
  nameFieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.b1, marginLeft: 14 },
  garudaDivider: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.goldBorder },


  // Actions
  actionRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.b2,
  },
  revertBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, minHeight: 46,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.b2,
    backgroundColor: 'transparent',
  },
  revertBtnText: { color: C.t2, fontSize: 13, fontWeight: '700' },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, minHeight: 46,
    backgroundColor: C.goldLight, borderRadius: 12,
  },
  saveBtnText: { color: C.navy, fontSize: 14, fontWeight: '800' },

  // ── Option Picker ──
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: C.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.b2,
  },
  pickerTitle: {
    fontSize: 14, fontWeight: '800', color: C.t1,
    textAlign: 'center', letterSpacing: 0.2,
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: C.b2,
    marginTop: 16, marginBottom: 8,
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.b1,
  },
  pickerOptionActive: {},
  pickerOptionText: { fontSize: 15, fontWeight: '500', color: C.t2 },
  pickerOptionTextActive: { fontWeight: '700', color: C.t1 },
});
