import { NativeModules, Platform } from 'react-native';

const PACKAGE = 'com.tomhoel.thaiid';
const COUNTRIES = ['th', 'sg', 'br', 'us', 'vn'];

/**
 * Switches the app's launcher icon by enabling/disabling activity aliases.
 * Requires app restart to take effect on the home screen.
 */
export async function setAppIcon(countryCode: string): Promise<void> {
  if (Platform.OS !== 'android') return;

  const code = countryCode.toLowerCase();
  if (!COUNTRIES.includes(code)) return;

  try {
    // Use the ReactNative bridge to call PackageManager
    const { DynamicIconModule } = NativeModules;
    if (DynamicIconModule) {
      await DynamicIconModule.setIcon(code);
    }
  } catch (e) {
    console.log('[DynamicIcon] Native module not available, skipping icon change');
  }
}
