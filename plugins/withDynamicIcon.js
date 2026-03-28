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

function withDynamicIcon(config) {
  // Step 1: Add activity-aliases to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];
    const mainActivity = app.activity[0];
    const pkg = manifest.manifest.$.package;

    // Ensure main activity has the right setup
    // Remove LAUNCHER intent-filter from main activity (we'll use aliases)
    // Actually, keep the default one and add aliases for alternatives

    // Add activity-alias entries for each country
    if (!app['activity-alias']) {
      app['activity-alias'] = [];
    }

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

    // Disable the LAUNCHER intent-filter on the main activity
    // so only the aliases show in the launcher
    if (mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = mainActivity['intent-filter'].map(filter => {
        const hasLauncher = filter.category?.some(
          c => c.$['android:name'] === 'android.intent.category.LAUNCHER'
        );
        if (hasLauncher) {
          // Change LAUNCHER to DEFAULT so it doesn't show in launcher
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

  // Step 2: Inject app_name_XX strings into strings.xml
  config = withDangerousMod(config, ['android', (config) => {
    const stringsPath = path.join(
      config.modRequest.platformProjectRoot,
      'app', 'src', 'main', 'res', 'values', 'strings.xml'
    );
    if (fs.existsSync(stringsPath)) {
      let xml = fs.readFileSync(stringsPath, 'utf8');
      for (const country of COUNTRIES) {
        const name = `app_name_${country}`;
        if (!xml.includes(`name="${name}"`)) {
          xml = xml.replace('</resources>', `  <string name="${name}">${APP_NAMES[country]}</string>\n</resources>`);
        }
      }
      fs.writeFileSync(stringsPath, xml);
    }
    return config;
  }]);

  return config;
}

module.exports = withDynamicIcon;
