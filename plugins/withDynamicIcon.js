const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['th', 'sg', 'br', 'us', 'vn'];
const BG_COLORS = {
  th: '#0C1526',
  sg: '#6B1520',
  br: '#0A3D1F',
  us: '#0D2240',
  vn: '#DA251D',
};
const APP_NAMES = {
  th: 'Thai ID',
  sg: 'SG NRIC',
  br: 'Brasil ID',
  us: 'NYC ID',
  vn: 'Vietnam ID',
};

function dynamicIconModuleJava(pkg) {
  const javaCountries = COUNTRIES.map(c => `"${c}"`).join(', ');
  return `package ${pkg};

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class DynamicIconModule extends ReactContextBaseJavaModule {
    private static final String[] COUNTRIES = {${javaCountries}};
    private static final String PACKAGE = "${pkg}";

    DynamicIconModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "DynamicIconModule";
    }

    @ReactMethod
    public void setIcon(String countryCode, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            for (String code : COUNTRIES) {
                ComponentName cn = new ComponentName(PACKAGE, PACKAGE + ".DynamicIcon_" + code);
                boolean isTarget = code.equals(countryCode.toLowerCase());
                pm.setComponentEnabledSetting(
                    cn,
                    isTarget
                        ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP
                );
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ICON_ERROR", e.getMessage());
        }
    }
}
`;
}

function dynamicIconPackageJava(pkg) {
  return `package ${pkg};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DynamicIconPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new DynamicIconModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;
}

function injectBridgeFiles(config) {
  const pkg = config.android?.package;
  if (!pkg) throw new Error('[withDynamicIcon] config.android.package is required');
  const javaDir = path.join(
    config.modRequest.platformProjectRoot,
    'app', 'src', 'main', 'java',
    ...pkg.split('.'),
  );
  fs.mkdirSync(javaDir, { recursive: true });
  fs.writeFileSync(path.join(javaDir, 'DynamicIconModule.java'), dynamicIconModuleJava(pkg));
  fs.writeFileSync(path.join(javaDir, 'DynamicIconPackage.java'), dynamicIconPackageJava(pkg));
}

function patchMainApplicationKt(config) {
  const pkg = config.android?.package;
  const ktPath = path.join(
    config.modRequest.platformProjectRoot,
    'app', 'src', 'main', 'java',
    ...pkg.split('.'),
    'MainApplication.kt',
  );
  if (!fs.existsSync(ktPath)) {
    throw new Error(`[withDynamicIcon] MainApplication.kt not found at ${ktPath}. Did Expo prebuild fail?`);
  }
  let kt = fs.readFileSync(ktPath, 'utf8');

  // Idempotent: skip if already patched
  if (kt.includes('add(DynamicIconPackage())')) return;

  // Find the apply block and inject the add call as its first child statement.
  // Matches: PackageList(this).packages.apply {
  // followed by optional whitespace and a newline.
  const applyRegex = /(PackageList\(this\)\.packages\.apply\s*\{\s*\n)/;
  if (!applyRegex.test(kt)) {
    throw new Error(
      `[withDynamicIcon] Could not find 'PackageList(this).packages.apply {' in MainApplication.kt at ${ktPath}. ` +
      `The Expo template likely changed; update the regex in plugins/withDynamicIcon.js.`
    );
  }
  kt = kt.replace(applyRegex, (_match, prefix) => {
    // Derive body indent from the `apply {` line so the inserted call aligns
    // with however the Expo template (current or future) indents the block.
    const applyLineMatch = prefix.match(/(^|\n)([ \t]*)PackageList/);
    const applyIndent = applyLineMatch ? applyLineMatch[2] : '';
    const bodyIndent = applyIndent + '  '; // one extra level (2 spaces)
    return prefix + bodyIndent + 'add(DynamicIconPackage())\n';
  });
  fs.writeFileSync(ktPath, kt);
}

function injectStringsXml(config) {
  const stringsPath = path.join(
    config.modRequest.platformProjectRoot,
    'app', 'src', 'main', 'res', 'values', 'strings.xml',
  );
  if (!fs.existsSync(stringsPath)) return;
  let xml = fs.readFileSync(stringsPath, 'utf8');
  for (const country of COUNTRIES) {
    const name = `app_name_${country}`;
    if (!xml.includes(`name="${name}"`)) {
      xml = xml.replace('</resources>', `  <string name="${name}">${APP_NAMES[country]}</string>\n</resources>`);
    }
  }
  fs.writeFileSync(stringsPath, xml);
}

function withDynamicIcon(config) {
  // Step 1: Add activity-aliases to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];
    const mainActivity = app.activity[0];
    const pkg = manifest.manifest.$.package;

    if (!app['activity-alias']) app['activity-alias'] = [];

    // Remove existing aliases to avoid duplicates on rebuild
    app['activity-alias'] = app['activity-alias'].filter(
      a => !a.$['android:name']?.startsWith('.DynamicIcon')
    );

    for (const country of COUNTRIES) {
      const isDefault = country === 'th';
      app['activity-alias'].push({
        $: {
          'android:name': `.DynamicIcon_${country}`,
          'android:targetActivity': '.MainActivity',
          'android:enabled': isDefault ? 'true' : 'false',
          'android:icon': `@mipmap/ic_launcher_${country}`,
          'android:roundIcon': `@mipmap/ic_launcher_${country}_round`,
          'android:label': `@string/app_name_${country}`,
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }

    // Disable the LAUNCHER intent-filter on the main activity so only aliases show
    if (mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = mainActivity['intent-filter'].map(filter => {
        const hasLauncher = filter.category?.some(
          c => c.$['android:name'] === 'android.intent.category.LAUNCHER'
        );
        if (hasLauncher) {
          filter.category = filter.category.map(c => {
            if (c.$['android:name'] === 'android.intent.category.LAUNCHER') {
              return { $: { 'android:name': 'android.intent.category.DEFAULT' } };
            }
            return c;
          });
        }
        return filter;
      });
    }

    return config;
  });

  // Step 2: Inject the native bridge Java files + register in MainApplication.kt
  config = withDangerousMod(config, ['android', (config) => {
    injectBridgeFiles(config);
    patchMainApplicationKt(config);
    return config;
  }]);

  // Step 3: Inject app_name_XX strings into strings.xml
  config = withDangerousMod(config, ['android', (config) => {
    injectStringsXml(config);
    return config;
  }]);

  return config;
}

// Test-only entry point: runs the dangerous mod side-effects (file writes) directly,
// bypassing Expo's mod scheduler. Production code path uses withDangerousMod above.
withDynamicIcon.__runDangerousModsForTest = async function(config) {
  injectBridgeFiles(config);
  patchMainApplicationKt(config);
  injectStringsXml(config);
};

module.exports = withDynamicIcon;
