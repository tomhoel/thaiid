import { NativeModules, Platform } from 'react-native';
import { reportError } from '../utils/reportError';

const COUNTRIES = ['th', 'sg', 'br', 'us', 'vn'];

/**
 * Switches the app's launcher icon by enabling/disabling activity aliases.
 * Requires app restart to take effect on the home screen.
 *
 * Throws if the native module is missing (i.e. the prebuild plugin failed
 * to inject it). Caller is expected to catch and surface a user message.
 */
export async function setAppIcon(countryCode: string): Promise<void> {
  if (Platform.OS !== 'android') return;

  const code = countryCode.toLowerCase();
  if (!COUNTRIES.includes(code)) {
    throw new Error(`[DynamicIcon] Unknown country code: ${countryCode}`);
  }

  const { DynamicIconModule } = NativeModules;
  if (!DynamicIconModule) {
    const err = new Error('Native module DynamicIconModule is not registered. Rebuild the app with the withDynamicIcon plugin.');
    reportError('DynamicIcon', err);
    throw err;
  }

  await DynamicIconModule.setIcon(code);
}
