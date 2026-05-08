# v5.0.0 Wave 1 — Icon Bridge & Error Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v4.0.5 of the Digital ID app: dynamic launcher-icon switching works on Pixel 10 Pro, silent error swallowing is replaced by a single error reporter, a non-blocking Snackbar tells the user the icon updates on next launch, dead UI is removed, and a Vitest + APK-contract scaffold guards against the icon-bridge regression we just shipped.

**Architecture:** A new `withDangerousMod` step in the existing Expo config plugin generates the missing Java native bridge files and patches `MainApplication.kt` on every prebuild — so the bridge can never go missing again, regardless of which machine builds. A `reportError(scope, error, opts)` utility replaces 16 silent `.catch(console.warn)` patterns. A tiny in-app Snackbar (no new dep) carries user-visible error toasts and the restart-to-apply icon hint. A `scripts/check-apk.sh` invoked from `release.sh` after `assembleRelease` reads the APK's dex bytes and aborts the release if `DynamicIconModule` or `DynamicIconPackage` aren't present.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router, expo config plugins (`withAndroidManifest`, `withDangerousMod`), TypeScript strict, react-native-reanimated (already a dep, used for the Snackbar slide-in), Vitest (new), AsyncStorage, expo-file-system/next.

**Reference spec:** `docs/superpowers/specs/2026-05-08-v5-wave-1-icon-bridge-and-errors-design.md`

---

## Task 1: Vitest scaffold

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

The plugin and the error reporter both have testable logic that doesn't need React Native running. Vitest in Node mode is sufficient; component tests are deferred to Wave 4 per the spec. The `tests/` directory pattern keeps test files out of the production bundle automatically.

- [ ] **Step 1: Add Vitest as a dev dependency**

Run: `npm i -D vitest@latest`

Expected: `package.json` gains `"vitest": "^x.y.z"` under `devDependencies` and `package-lock.json` updates. No errors.

- [ ] **Step 2: Add the test script to `package.json`**

Edit the `"scripts"` object in `package.json` to add a `"test"` entry. The full block becomes:

```json
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts` with this exact content:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    globals: false,
  },
});
```

- [ ] **Step 4: Verify `npm test` runs cleanly with no tests yet**

Run: `npm test`

Expected: Vitest runs, prints `No test files found, exiting with code 0` (or similar) and exits 0.

If it exits non-zero because Vitest treats "no tests" as failure, add `--passWithNoTests` to the script: `"test": "vitest run --passWithNoTests"`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Add Vitest scaffold for plugin and script tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Plugin TDD — Java module file generation

**Files:**
- Create: `tests/plugins/withDynamicIcon.test.js`
- Modify: `plugins/withDynamicIcon.js`

This task uses TDD to extend the existing config plugin with a third step that writes `DynamicIconModule.java` and `DynamicIconPackage.java` into `android/app/src/main/java/<package>/`. The test runs the new step against an in-memory mock Expo `config` with a temp directory as `platformProjectRoot`.

- [ ] **Step 1: Write the failing test for Java file generation**

Create `tests/plugins/withDynamicIcon.test.js` with this exact content:

```js
const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const os = require('os');
const withDynamicIcon = require('../../plugins/withDynamicIcon.js');

function mockConfig(platformProjectRoot, pkg = 'com.example.app') {
  return {
    android: { package: pkg },
    modResults: {
      manifest: {
        $: { package: pkg },
        application: [{
          activity: [{ 'intent-filter': [] }],
        }],
      },
    },
    modRequest: { platformProjectRoot, projectRoot: platformProjectRoot },
  };
}

function seedMainApplicationKt(platformProjectRoot, pkg) {
  const dir = path.join(platformProjectRoot, 'app', 'src', 'main', 'java', ...pkg.split('.'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'MainApplication.kt'), `package ${pkg}

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactPackage

class MainApplication : Application() {
  override fun getPackages(): List<ReactPackage> =
      PackageList(this).packages.apply {
        // packages added here
      }
}
`);
  // Also seed strings.xml for the existing step that injects strings
  const resDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'values');
  fs.mkdirSync(resDir, { recursive: true });
  fs.writeFileSync(path.join(resDir, 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">Test</string>
</resources>
`);
}

function runPlugin(config) {
  // The plugin returns a config; in real Expo, withAndroidManifest and withDangerousMod
  // are wrappers that schedule mods. For this test we drive the dangerous mod directly
  // by inspecting plugin output — see Step 3 implementation.
  return withDynamicIcon(config);
}

describe('withDynamicIcon plugin — Java bridge generation', () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thaiid-plugin-test-'));
    seedMainApplicationKt(tmp, 'com.example.app');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('writes DynamicIconModule.java with the configured package', async () => {
    const config = mockConfig(tmp, 'com.example.app');
    await withDynamicIcon.__runDangerousModsForTest(config);

    const javaPath = path.join(tmp, 'app', 'src', 'main', 'java', 'com', 'example', 'app', 'DynamicIconModule.java');
    expect(fs.existsSync(javaPath)).toBe(true);
    const java = fs.readFileSync(javaPath, 'utf8');
    expect(java).toContain('package com.example.app;');
    expect(java).toContain('public class DynamicIconModule');
    expect(java).toContain('return "DynamicIconModule"');
  });

  it('writes DynamicIconPackage.java with the configured package', async () => {
    const config = mockConfig(tmp, 'com.example.app');
    await withDynamicIcon.__runDangerousModsForTest(config);

    const javaPath = path.join(tmp, 'app', 'src', 'main', 'java', 'com', 'example', 'app', 'DynamicIconPackage.java');
    expect(fs.existsSync(javaPath)).toBe(true);
    const java = fs.readFileSync(javaPath, 'utf8');
    expect(java).toContain('package com.example.app;');
    expect(java).toContain('public class DynamicIconPackage implements ReactPackage');
    expect(java).toContain('new DynamicIconModule(reactContext)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: 2 failing tests. The error mentions `__runDangerousModsForTest is not a function` (or similar), because the plugin doesn't expose that helper yet.

- [ ] **Step 3: Implement the Java-file-injection dangerous mod**

Edit `plugins/withDynamicIcon.js`. Add the new step **after** the existing `withAndroidManifest` step and **before** the existing `withDangerousMod` strings.xml step. Also add module-level helpers for the Java templates and a test-only export.

The complete updated file should be:

```js
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

  // Step 2: Inject the native bridge Java files
  config = withDangerousMod(config, ['android', (config) => {
    injectBridgeFiles(config);
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
  injectStringsXml(config);
};

module.exports = withDynamicIcon;
```

- [ ] **Step 4: Run tests to verify both pass**

Run: `npm test`

Expected: 2 passing tests (the two `it(...)` blocks in `withDynamicIcon.test.js`).

- [ ] **Step 5: Commit**

```bash
git add plugins/withDynamicIcon.js tests/plugins/withDynamicIcon.test.js
git commit -m "Inject DynamicIconModule/Package Java files via prebuild plugin

Adds a withDangerousMod step that writes DynamicIconModule.java and
DynamicIconPackage.java to android/app/src/main/java/<package>/ on
every prebuild, using config.android.package for portability. Replaces
the untracked, gitignored hand-placed files that disappeared on the
macOS build of v4.0.4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Plugin TDD — MainApplication.kt patch + idempotence

**Files:**
- Modify: `tests/plugins/withDynamicIcon.test.js`
- Modify: `plugins/withDynamicIcon.js`

The Java files alone aren't enough — `MainApplication.kt` must register `DynamicIconPackage()` in the React package list, otherwise React Native can't load the module. Expo's prebuild regenerates `MainApplication.kt` from a template every build; this patch finds the regenerated file and injects the registration.

- [ ] **Step 1: Add the failing MainApplication.kt patch tests**

Append to `tests/plugins/withDynamicIcon.test.js`, inside the same `describe(...)` block (after the second `it`):

```js
  it('patches MainApplication.kt to register DynamicIconPackage', async () => {
    const config = mockConfig(tmp, 'com.example.app');
    await withDynamicIcon.__runDangerousModsForTest(config);

    const ktPath = path.join(tmp, 'app', 'src', 'main', 'java', 'com', 'example', 'app', 'MainApplication.kt');
    const kt = fs.readFileSync(ktPath, 'utf8');
    expect(kt).toContain('add(DynamicIconPackage())');
    // Must be inside the apply block, not at the top of the file
    expect(kt.indexOf('add(DynamicIconPackage())'))
      .toBeGreaterThan(kt.indexOf('PackageList(this).packages.apply'));
  });

  it('is idempotent — running twice does not duplicate the add line', async () => {
    const config = mockConfig(tmp, 'com.example.app');
    await withDynamicIcon.__runDangerousModsForTest(config);
    await withDynamicIcon.__runDangerousModsForTest(config);

    const ktPath = path.join(tmp, 'app', 'src', 'main', 'java', 'com', 'example', 'app', 'MainApplication.kt');
    const kt = fs.readFileSync(ktPath, 'utf8');
    const occurrences = (kt.match(/add\(DynamicIconPackage\(\)\)/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('throws a clear error when MainApplication.kt template does not match', async () => {
    const config = mockConfig(tmp, 'com.example.app');
    // Overwrite the seeded template with one that has no apply block
    const ktPath = path.join(tmp, 'app', 'src', 'main', 'java', 'com', 'example', 'app', 'MainApplication.kt');
    fs.writeFileSync(ktPath, 'package com.example.app\n\nclass MainApplication { }\n');

    await expect(withDynamicIcon.__runDangerousModsForTest(config))
      .rejects.toThrow(/MainApplication.kt/);
  });
```

- [ ] **Step 2: Run tests to verify all 3 new tests fail**

Run: `npm test`

Expected: 2 passing (from Task 2), 3 failing. The failures mention either "Cannot find `add(DynamicIconPackage())` in file" or assertions about content not present.

- [ ] **Step 3: Implement the MainApplication.kt patcher**

In `plugins/withDynamicIcon.js`, add a new helper `patchMainApplicationKt(config)` and call it from both the production dangerous mod and the test entry point.

Add this function near `injectBridgeFiles`:

```js
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
  kt = kt.replace(applyRegex, '$1              add(DynamicIconPackage())\n');
  fs.writeFileSync(ktPath, kt);
}
```

Then update the production dangerous mod (Step 2 in `withDynamicIcon`) to also call the patcher:

```js
  // Step 2: Inject the native bridge Java files + register in MainApplication.kt
  config = withDangerousMod(config, ['android', (config) => {
    injectBridgeFiles(config);
    patchMainApplicationKt(config);
    return config;
  }]);
```

Update the test entry point at the bottom of the file:

```js
withDynamicIcon.__runDangerousModsForTest = async function(config) {
  injectBridgeFiles(config);
  patchMainApplicationKt(config);
  injectStringsXml(config);
};
```

- [ ] **Step 4: Run tests to verify all 5 pass**

Run: `npm test`

Expected: 5 passing tests, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add plugins/withDynamicIcon.js tests/plugins/withDynamicIcon.test.js
git commit -m "Patch MainApplication.kt to register DynamicIconPackage on prebuild

Idempotent regex injection. Throws a clear error if the Expo template
shape changes so future maintainers see the failure loudly. Tests
cover the inject, idempotence, and the missing-template error case.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: APK contract test script

**Files:**
- Create: `scripts/check-apk.sh`
- Modify: `release.sh`

A bash script that scans dex bytes for `DynamicIconModule` and `DynamicIconPackage` strings — the same diagnostic technique used to confirm the v4.0.4 bug. Runs against any APK passed as an argument; exits non-zero if either class is missing.

- [ ] **Step 1: Create the script**

Create `scripts/check-apk.sh` with this exact content:

```bash
#!/usr/bin/env bash
# Asserts that the APK contains the DynamicIcon native bridge classes.
# Run: ./scripts/check-apk.sh path/to/app-release.apk
set -e

APK="$1"
if [ -z "$APK" ] || [ ! -f "$APK" ]; then
  echo "Usage: $0 path/to/app.apk" >&2
  exit 2
fi

REQUIRED=("DynamicIconModule" "DynamicIconPackage")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

unzip -q -o "$APK" 'classes*.dex' -d "$TMP"

missing=()
for class in "${REQUIRED[@]}"; do
  found=0
  for dex in "$TMP"/classes*.dex; do
    if grep -aq "$class" "$dex"; then
      found=1
      break
    fi
  done
  if [ "$found" -eq 0 ]; then
    missing+=("$class")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "ERROR: APK is missing the dynamic icon native bridge classes:" >&2
  for c in "${missing[@]}"; do echo "  - $c" >&2; done
  echo "" >&2
  echo "Likely cause: the withDynamicIcon plugin failed to inject Java files," >&2
  echo "or MainApplication.kt was not patched to register DynamicIconPackage." >&2
  exit 1
fi

echo "OK: APK contains DynamicIconModule and DynamicIconPackage."
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/check-apk.sh`

- [ ] **Step 3: Verify it correctly flags the broken v4.0.4 APK**

Download v4.0.4 (the bug we're fixing) to a temp location and run the script — it should fail.

Run:
```bash
gh release download v4.0.4 --repo tomhoel/thaiid --pattern "*.apk" -O /tmp/check-v4.0.4.apk
./scripts/check-apk.sh /tmp/check-v4.0.4.apk
```

Expected output:
```
ERROR: APK is missing the dynamic icon native bridge classes:
  - DynamicIconModule
  - DynamicIconPackage

Likely cause: ...
```

Exit code: 1.

This proves the script catches the exact regression. Delete the test APK afterward: `rm /tmp/check-v4.0.4.apk`.

- [ ] **Step 4: Wire `check-apk.sh` into `release.sh`**

Edit `release.sh`. Insert the contract check immediately after the `gradlew assembleRelease` block and before the tag-and-release block. The relevant region of the file becomes:

```bash
echo "==> Build APK"
rm -rf android/app/build/generated/assets/createBundleReleaseJsAndAssets
cd android
ANDROID_HOME="$ANDROID_HOME" ./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$KEYSTORE" \
  -Pandroid.injected.signing.store.password="$KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias=thaiid \
  -Pandroid.injected.signing.key.password="$KEYSTORE_PASSWORD"
cd ..

echo "==> Verify APK contains native bridge"
"$SCRIPT_DIR/scripts/check-apk.sh" "$APK"

echo "==> Tag & release $VERSION"
```

- [ ] **Step 5: Commit**

```bash
git add scripts/check-apk.sh release.sh
git commit -m "Add APK contract test that aborts release if native bridge missing

Scans classes*.dex for DynamicIconModule and DynamicIconPackage.
Hooked into release.sh between assembleRelease and tag/release so a
broken build never reaches GitHub releases or Obtainium.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: reportError utility (TDD)

**Files:**
- Create: `tests/utils/reportError.test.ts`
- Create: `src/utils/reportError.ts`

A single function with a settable handler for the user-visible toast. The handler is set by `SnackbarProvider` at app boot (Task 7). Tests cover: log format, no-toast path, with-toast path via injected mock handler.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/reportError.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportError, _setSnackbarHandlerForTest, _resetSnackbarHandlerForTest } from '../../src/utils/reportError';

describe('reportError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    _resetSnackbarHandlerForTest();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs to console.error with [scope] prefix and the error message', () => {
    reportError('test-scope', new Error('boom'));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [first] = consoleSpy.mock.calls[0];
    expect(first).toMatch(/^\[test-scope\]/);
    expect(first).toContain('boom');
  });

  it('handles non-Error values', () => {
    reportError('test-scope', 'a string error');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('a string error');
  });

  it('does not call snackbar handler when userVisible is omitted', () => {
    const handler = vi.fn();
    _setSnackbarHandlerForTest(handler);
    reportError('test-scope', new Error('quiet'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls snackbar handler with provided toast text when userVisible is true', () => {
    const handler = vi.fn();
    _setSnackbarHandlerForTest(handler);
    reportError('test-scope', new Error('boom'), { userVisible: true, toast: 'Save failed.' });
    expect(handler).toHaveBeenCalledWith('Save failed.');
  });

  it('uses a generic toast when userVisible is true and no toast provided', () => {
    const handler = vi.fn();
    _setSnackbarHandlerForTest(handler);
    reportError('test-scope', new Error('boom'), { userVisible: true });
    expect(handler).toHaveBeenCalledWith('Something went wrong. Please try again.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: All 5 reportError tests fail with `Cannot find module '../../src/utils/reportError'` or similar.

- [ ] **Step 3: Implement `reportError`**

Create `src/utils/reportError.ts` with:

```ts
export interface ReportOptions {
  /** Show a Snackbar to the user. Default: false. */
  userVisible?: boolean;
  /** Custom toast text. Falls back to a generic message. */
  toast?: string;
}

type SnackbarHandler = (text: string) => void;

let snackbarHandler: SnackbarHandler | null = null;

/** Called by SnackbarProvider on mount. */
export function setSnackbarHandler(handler: SnackbarHandler) {
  snackbarHandler = handler;
}

/** Single sink for all caught errors in the app. */
export function reportError(scope: string, error: unknown, opts: ReportOptions = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}] ${message}`, error);

  // Wave 4 hook: Sentry.captureException(error, { tags: { scope } });

  if (opts.userVisible && snackbarHandler) {
    snackbarHandler(opts.toast ?? 'Something went wrong. Please try again.');
  }
}

// Test-only helpers — kept minimal, prefixed with underscore.
export function _setSnackbarHandlerForTest(handler: SnackbarHandler | null) {
  snackbarHandler = handler;
}
export function _resetSnackbarHandlerForTest() {
  snackbarHandler = null;
}
```

- [ ] **Step 4: Run tests to verify all 5 pass**

Run: `npm test`

Expected: 8 tests passing total (5 plugin tests + 3 reportError... wait, 5 reportError tests). 10 total passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/reportError.ts tests/utils/reportError.test.ts
git commit -m "Add reportError utility with optional user-visible toast

Single sink for all caught errors. Logs to console.error with [scope]
prefix. Optional userVisible flag triggers a Snackbar via a handler
set by SnackbarProvider. Wave 4 will plug Sentry into the same seam.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Snackbar context + component

**Files:**
- Create: `src/context/SnackbarContext.tsx`
- Create: `src/components/Snackbar.tsx`

A tiny in-app Snackbar with no new dependency — uses the already-installed `react-native-reanimated` for the slide-in. Material-3-flavored: dark surface, light text, no action button (per design decision in spec).

- [ ] **Step 1: Create the SnackbarContext**

Create `src/context/SnackbarContext.tsx` with:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Snackbar } from '../components/Snackbar';
import { setSnackbarHandler } from '../utils/reportError';

interface SnackbarApi {
  show: (text: string, opts?: { durationMs?: number }) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string, opts?: { durationMs?: number }) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setText(next);
    timerRef.current = setTimeout(() => setText(null), opts?.durationMs ?? 4000);
  }, []);

  // Bridge reportError -> snackbar
  useEffect(() => {
    setSnackbarHandler((t) => show(t));
    return () => setSnackbarHandler(() => {});
  }, [show]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <Snackbar text={text} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}
```

- [ ] **Step 2: Create the Snackbar component**

Create `src/components/Snackbar.tsx` with:

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const ENTER_DURATION = 220;
const EXIT_DURATION = 180;

export function Snackbar({ text }: { text: string | null }) {
  const visible = text !== null;
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = withTiming(80, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Always render — animated translateY/opacity drive visibility. Avoids unmount races.
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        { backgroundColor: colors.bgElevated, borderColor: colors.b1 },
        animatedStyle,
      ]}
    >
      <Text style={[styles.text, { color: colors.t1 }]}>{text ?? ''}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
```

- [ ] **Step 3: Commit (no test for the component itself — deferred to Wave 4)**

```bash
git add src/context/SnackbarContext.tsx src/components/Snackbar.tsx
git commit -m "Add Snackbar context + component for user-visible toasts

No new dep — uses react-native-reanimated (already installed) for the
slide-in. Bridges reportError so any caller of reportError(..., {
userVisible: true }) surfaces a toast. Material-3-flavored, theme-aware,
no action button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire SnackbarProvider into the app tree

**Files:**
- Modify: `app/_layout.tsx`

`SnackbarProvider` goes inside `ThemeProvider` (so it can read theme colors) and inside `LanguageProvider` is unnecessary, but we'll put it at the right depth: between `ThemeAccentBridge` and `LanguageProvider`. The Snackbar must render *over* the rest of the app — placing the provider below `AppShell` won't work because the Snackbar lives inside the provider.

- [ ] **Step 1: Add SnackbarProvider to the context tree**

Edit `app/_layout.tsx`. Add the import near the other context imports:

```tsx
import { SnackbarProvider } from '../src/context/SnackbarContext';
```

Update the `RootLayout` JSX. The full updated function becomes:

```tsx
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <CountryProvider>
            <ThemeAccentBridge>
            <SnackbarProvider>
            <LanguageProvider>
              <ProfileProvider>
                <BiometricProvider>
                  <AppShell />
                </BiometricProvider>
              </ProfileProvider>
            </LanguageProvider>
            </SnackbarProvider>
            </ThemeAccentBridge>
          </CountryProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Sanity-check the dev server boots**

Run: `npx expo start --clear`

Expected: Metro bundler starts without errors. Press `q` to quit after confirming.

If a circular-import error appears, ensure `SnackbarContext.tsx` imports `useTheme` only via `Snackbar.tsx`, not directly. The current code already does this.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Wire SnackbarProvider into the context tree

Sits inside ThemeProvider so the snackbar can read theme colors. The
provider also subscribes reportError to the snackbar via setSnackbarHandler.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: DynamicIcon.ts — throw on missing native module

**Files:**
- Modify: `src/modules/DynamicIcon.ts`
- Modify: `app/(tabs)/settings.tsx`

`setAppIcon` currently swallows the missing-module case in a `console.log` catch. Per spec, it should `reportError` and throw, and the caller in `settings.tsx` should show the snackbar with the restart hint on success or the unavailable hint on failure.

- [ ] **Step 1: Update DynamicIcon.ts**

Replace the entire contents of `src/modules/DynamicIcon.ts` with:

```ts
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
```

- [ ] **Step 2: Update the country picker `onSelect` in settings.tsx**

Edit `app/(tabs)/settings.tsx`. Find the `onSelect` callback inside the country picker (the `<Item ... label={t('settings.country')} ...>`, currently around `settings.tsx:500`):

Current code:
```tsx
selected: country,
onSelect: (k) => { setCountry(k as any); setAppIcon(k); setPicker(null); },
```

Replace with:
```tsx
selected: country,
onSelect: async (k) => {
  setCountry(k as any);
  setPicker(null);
  try {
    await setAppIcon(k);
    snackbar.show('Icon will update on next app open.');
  } catch {
    // reportError already logged in DynamicIcon.ts
    snackbar.show('Icon switching unavailable in this build.');
  }
},
```

Add the `useSnackbar` hook import at the top of `settings.tsx` (with the other hooks):

```tsx
import { useSnackbar } from '../../src/context/SnackbarContext';
```

And inside `SettingsScreen()`, near the other context hooks (around line 73-77):

```tsx
const snackbar = useSnackbar();
```

- [ ] **Step 3: Run the dev server and manually verify wiring compiles**

Run: `npx expo start --clear`

Expected: Metro bundles without errors. Quit with `q`.

(Full device test happens in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add src/modules/DynamicIcon.ts app/\(tabs\)/settings.tsx
git commit -m "DynamicIcon throws on missing native module; settings shows snackbar

Replaces the silent console.log fallthrough with reportError + throw.
Country-picker onSelect catches the throw and shows
'Icon switching unavailable in this build.' On success, shows
'Icon will update on next app open.'

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Sweep silent error handlers — critical paths

**Files:**
- Modify: `src/context/ProfileContext.tsx`
- Modify: `app/(tabs)/settings.tsx`

These are the cases marked **Critical** in the spec sweep table — failures here lose user data, so they get `userVisible: true`.

- [ ] **Step 1: Profile save in ProfileContext.tsx**

Edit `src/context/ProfileContext.tsx`. Add the import near the top:

```tsx
import { reportError } from '../utils/reportError';
```

Replace lines 106-112 (the `updateProfile` callback). Currently:

```tsx
  const updateProfile = useCallback((updates: Partial<ProfileType>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(storageKey(country), JSON.stringify(next)).catch(console.warn);
      return next;
    });
  }, [country]);
```

Becomes:

```tsx
  const updateProfile = useCallback((updates: Partial<ProfileType>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(storageKey(country), JSON.stringify(next))
        .catch((e) => reportError('ProfileContext.updateProfile', e, {
          userVisible: true,
          toast: 'Could not save profile changes.',
        }));
      return next;
    });
  }, [country]);
```

- [ ] **Step 2: Cross-country sync in settings.tsx**

Edit `app/(tabs)/settings.tsx`. Find `syncSharedToOthers` (around line 148-181). Replace the inner `catch (e) { console.warn('[Sync]', e); }` (around line 179) with:

```tsx
      } catch (e) {
        reportError('settings.syncSharedToOthers', e, {
          userVisible: true,
          toast: 'Could not sync changes to all countries.',
        });
      }
```

Add the `reportError` import near the top of `settings.tsx`:

```tsx
import { reportError } from '../../src/utils/reportError';
```

- [ ] **Step 3: Sanity-check Metro bundles**

Run: `npx expo start --clear`

Expected: bundles successfully. Quit with `q`.

- [ ] **Step 4: Commit**

```bash
git add src/context/ProfileContext.tsx app/\(tabs\)/settings.tsx
git commit -m "Surface critical save failures via reportError + user-visible toast

Profile saves and cross-country sync failures now show a snackbar
instead of silently logging. Both flows can lose user-entered data,
so the user needs to know if they fail.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Sweep silent error handlers — best-effort paths

**Files:**
- Modify: `src/context/ThemeContext.tsx`
- Modify: `src/context/CountryContext.tsx`
- Modify: `src/i18n/LanguageContext.tsx`
- Modify: `app/(tabs)/settings.tsx`

These are **Best-effort** in the spec — log structurally but don't bother the user. Note: `versionHistory.ts:104, 129, 141` (`try { ... } catch {}` cleanup deletes) are **explicitly kept as-is** per spec — file-delete failures during garbage collection add noise to logs.

- [ ] **Step 1: ThemeContext save**

Edit `src/context/ThemeContext.tsx`. Add the import:

```tsx
import { reportError } from '../utils/reportError';
```

Replace line 39 (`AsyncStorage.setItem(KEY, t).catch(console.warn);`) with:

```tsx
    AsyncStorage.setItem(KEY, t).catch((e) => reportError('ThemeContext.setTheme', e));
```

- [ ] **Step 2: CountryContext save**

Edit `src/context/CountryContext.tsx`. Add the import:

```tsx
import { reportError } from '../utils/reportError';
```

Replace line 87 (`AsyncStorage.setItem(KEY, c).catch(console.warn);`) with:

```tsx
    AsyncStorage.setItem(KEY, c).catch((e) => reportError('CountryContext.setCountry', e));
```

- [ ] **Step 3: LanguageContext saves (3 sites)**

Edit `src/i18n/LanguageContext.tsx`. Add the import:

```tsx
import { reportError } from '../utils/reportError';
```

Line 39 — replace:
```tsx
        await AsyncStorage.setItem(langKeyFor(prevCountry), lang).catch(console.warn);
```
with:
```tsx
        await AsyncStorage.setItem(langKeyFor(prevCountry), lang)
          .catch((e) => reportError('LanguageContext.saveOnCountryChange', e));
```

Line 54 — replace:
```tsx
    AsyncStorage.setItem(langKeyFor(country), l).catch(console.warn);
```
with:
```tsx
    AsyncStorage.setItem(langKeyFor(country), l)
      .catch((e) => reportError('LanguageContext.setLang', e));
```

Line 60 — replace:
```tsx
      AsyncStorage.setItem(langKeyFor(country), next).catch(console.warn);
```
with:
```tsx
      AsyncStorage.setItem(langKeyFor(country), next)
        .catch((e) => reportError('LanguageContext.toggle', e));
```

- [ ] **Step 4: settings.tsx remaining best-effort sites**

Edit `app/(tabs)/settings.tsx`. (The `reportError` import was added in Task 9.)

Lines 96-104 — replace the notif/sync toggle handlers. Currently:

```tsx
  const handleToggleNotif = async (v: boolean) => {
    setNotif(v);
    try { await AsyncStorage.setItem('@notifications', String(v)); } catch {}
  };

  const handleToggleSyncAll = async (v: boolean) => {
    setSyncAll(v);
    try { await AsyncStorage.setItem('@sync_all', String(v)); } catch {}
  };
```

Becomes:

```tsx
  const handleToggleNotif = async (v: boolean) => {
    setNotif(v);
    try { await AsyncStorage.setItem('@notifications', String(v)); }
    catch (e) { reportError('settings.toggleNotif', e); }
  };

  const handleToggleSyncAll = async (v: boolean) => {
    setSyncAll(v);
    try { await AsyncStorage.setItem('@sync_all', String(v)); }
    catch (e) { reportError('settings.toggleSyncAll', e); }
  };
```

Lines 185-186 — replace the revert cleanup:

```tsx
    await clearCardImages().catch(console.warn);
    await clearAllHistory().catch(console.warn);
```

with:

```tsx
    await clearCardImages().catch((e) => reportError('settings.handleRevert.clearCardImages', e));
    await clearAllHistory().catch((e) => reportError('settings.handleRevert.clearAllHistory', e));
```

Line 203 — replace:

```tsx
      await AsyncStorage.setItem(key, JSON.stringify({ ...defaults })).catch(console.warn);
```

with:

```tsx
      await AsyncStorage.setItem(key, JSON.stringify({ ...defaults }))
        .catch((e) => reportError(`settings.handleRevert.resetCountry.${code}`, e));
```

Lines 389 and 419 — replace the two `saveVersion(...).catch(console.warn)` calls:

Line 389:
```tsx
          if (cardFileUri) saveVersion(country, snap, cardFileUri, portraitFileUri)
            .catch((e) => reportError(`settings.saveVersion.${country}`, e));
```

Line 419:
```tsx
              saveVersion(code, targetProfile, fileUri, portraitFileUri)
                .catch((e) => reportError(`settings.saveVersion.${code}`, e));
```

- [ ] **Step 5: Verify no stray `.catch(console.warn)` remains in app code**

Run: `git diff --stat`, then:
```bash
grep -rn "catch(console.warn)" src app --include='*.ts' --include='*.tsx'
```

Expected output: no matches. (The two `try { delete } catch {}` blocks in `versionHistory.ts` are intentionally kept and do not match this pattern.)

- [ ] **Step 6: Sanity-check Metro bundles**

Run: `npx expo start --clear`

Expected: bundles successfully. Quit with `q`.

- [ ] **Step 7: Commit**

```bash
git add src/context/ThemeContext.tsx src/context/CountryContext.tsx src/i18n/LanguageContext.tsx app/\(tabs\)/settings.tsx
git commit -m "Replace silent .catch(console.warn) with reportError in best-effort paths

Theme, country, language saves and settings cleanup paths now log via
reportError with structured scope tags. No user-visible toasts (these
failures are not data loss).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Cleanup dead UI

**Files:**
- Modify: `app/(tabs)/settings.tsx`

Three small deletions per the spec:
1. The PIN settings item that shows a "Coming Soon" alert.
2. The Privacy settings item that shows a "Coming Soon" alert.
3. The unused `hasTextChanges` block in `handleSaveGenerate`.

Translation keys (`t('settings.pin')`, `t('settings.privacy')`) stay in the i18n files until Wave 2 — they may come back.

- [ ] **Step 1: Delete the PIN and Privacy items**

Edit `app/(tabs)/settings.tsx`. Find lines 484-485 (the two `<Item ...>` calls inside the Security section that use `Alert.alert('Coming Soon', ...)`). Delete both lines.

The Security section currently has:
```tsx
        <Item icon="finger-print-outline" label={t('settings.biometric')} toggle={bio} onToggle={setBio} colors={Colors} styles={styles} />
        <Item icon="lock-closed-outline" label={t('settings.pin')} onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available.')} colors={Colors} styles={styles} />
        <Item icon="eye-off-outline" label={t('settings.privacy')} last onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available.')} colors={Colors} styles={styles} />
```

After the delete, it becomes:
```tsx
        <Item icon="finger-print-outline" label={t('settings.biometric')} toggle={bio} onToggle={setBio} last colors={Colors} styles={styles} />
```

Note the added `last` prop on the biometric Item — it was on the deleted Privacy item and removes the bottom border on the last row in the section.

- [ ] **Step 2: Delete the unused `hasTextChanges` block**

In `handleSaveGenerate` (around lines 245-250), delete:

```tsx
        const savedData = cardDataRef.current;
        const hasTextChanges =
          snap.fullNameEnglish !== savedData.fullNameEnglish ||
          snap.dateOfBirth !== savedData.dateOfBirth ||
          snap.dateOfIssue !== savedData.dateOfIssue ||
          snap.dateOfExpiry !== savedData.dateOfExpiry;
```

Also remove the import or local references to `cardDataRef` if `hasTextChanges` was its only consumer. **Verify**: search the rest of `settings.tsx` for `cardDataRef` — if there are no other reads, delete the `useRef` declaration too. If there are other reads, leave the ref alone.

Run: `grep -n "cardDataRef" app/\(tabs\)/settings.tsx`

If only the `useRef` and `useEffect` setup lines remain (no other reads), delete those too:

```tsx
  const cardDataRef = useRef(cardData);
  useEffect(() => { cardDataRef.current = cardData; }, [cardData]);
```

- [ ] **Step 3: Verify Metro still bundles**

Run: `npx expo start --clear`

Expected: bundles successfully, no TypeScript errors. Quit with `q`.

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "Remove dead UI: 'Coming Soon' alerts and unused hasTextChanges

Deletes the PIN and Privacy settings items that did nothing but show
an alert. Removes the unused hasTextChanges computation in
handleSaveGenerate. Translation keys kept for now in case the features
return in Wave 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Final manual verification + ship v4.0.5

**Files:**
- (no edits — verification only)

End-to-end test on a real Pixel 10 Pro, then run the release script.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: 10 passing tests (5 plugin + 5 reportError), 0 failing.

- [ ] **Step 2: Plug in Pixel 10 Pro and confirm adb sees it**

Run (PowerShell): `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices`

Expected: 1 device listed with `device` (not `unauthorized` or `offline`).

If `unauthorized`, accept the USB-debugging prompt on the phone. If no device, check the phone has Developer Options + USB debugging enabled.

- [ ] **Step 3: Run release.sh for v4.0.5**

Run: `./release.sh v4.0.5`

Expected:
1. `==> Bump version to 4.0.5` — app.json updated, commit created.
2. `==> Prebuild` — Expo prebuild runs without errors.
3. `==> Generate country icons` — completes.
4. `==> Build APK` — Gradle assembleRelease succeeds.
5. `==> Verify APK contains native bridge` — `OK: APK contains DynamicIconModule and DynamicIconPackage.`
6. `==> Tag & release v4.0.5` — pushes commit and tag, creates GitHub release.
7. `==> Done!`

If `check-apk.sh` fails (`ERROR: APK is missing...`), do NOT tag. Investigate why the plugin didn't inject — likely the regex in `patchMainApplicationKt` didn't match because Expo regenerated `MainApplication.kt` differently than expected. The error message points to the file path.

- [ ] **Step 4: Install the new APK on the Pixel**

Run (PowerShell):
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "android\app\build\outputs\apk\release\app-release.apk"
```

Expected: `Performing Streamed Install` followed by `Success`.

- [ ] **Step 5: Manually verify the icon switch works**

On the Pixel:
1. Open Digital ID. Confirm Thai default icon on the home screen.
2. Settings → Country → Vietnam.
3. Confirm a Snackbar appears at the bottom: "Icon will update on next app open."
4. Press Home, then long-press Digital ID and remove from home screen, then re-add from app drawer (or swipe-up overview, swipe app away, and re-launch from drawer).
5. Confirm the launcher icon is now the Vietnam variant (red background, yellow star).
6. Repeat for SG, BR, US, then back to TH. All five icons should swap correctly.

If any switch doesn't take effect after a relaunch, run:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat -d | Select-String -Pattern "DynamicIcon|tomhoel"
```

Look for `DynamicIconModule` errors. If `NativeModules.DynamicIconModule is not registered` appears in the JS console (visible via `adb logcat ReactNativeJS:V`), the plugin's MainApplication.kt patch didn't take.

- [ ] **Step 6: Verify the failure-mode UX**

Optional but recommended: temporarily corrupt one alias name in `withDynamicIcon.js` (e.g. typo `_thh` instead of `_th`), rebuild, install, switch country. The Snackbar should show "Icon switching unavailable in this build." rather than silently doing nothing. Revert the typo before committing anything else.

- [ ] **Step 7: Update the auto-memory project file**

Update `C:\Users\tomho\.claude\projects\C--Users-tomho-Documents-thaiid\memory\project_thaiid.md` to reflect v4.0.5 and the new error-handling foundation. (One-line change to the version field, plus add a sentence under "Build process" noting `check-apk.sh` runs as part of release.sh.)

---

## Self-Review

After writing the plan, here's the spec-coverage check:

| Spec section | Covered by |
|---|---|
| Unit 1 — Plugin extension (Java + MainApp patch) | Tasks 2, 3 |
| Unit 2 — `reportError` + sweep table | Tasks 5, 9, 10 |
| Unit 3 — Snackbar + context | Task 6 |
| Unit 4 — Restart-to-apply hint | Task 8 (settings onSelect snackbar wiring) |
| Unit 5 — Cleanup (PIN/Privacy/`hasTextChanges`) | Task 11 |
| Unit 6 — Test scaffold + APK contract | Tasks 1, 4 |
| `DynamicIcon.ts` throw-on-missing | Task 8 |
| `versionHistory.ts` exemption from sweep | Documented in Task 10 (kept as-is) |
| `selectedPhotoMime` audit | Documented in spec section "Cleanup" — verified in use, no change needed |
| Rollout + manual test | Task 12 |

No placeholders. Type/method-name consistency check:

- `reportError(scope, error, opts?)` signature matches between `src/utils/reportError.ts` (Task 5), tests (Task 5), and all callers (Tasks 8-10).
- `setSnackbarHandler` / `_setSnackbarHandlerForTest` / `_resetSnackbarHandlerForTest` consistent.
- `useSnackbar()` returns `{ show }` — matches both Task 6 and Task 8 usage.
- Plugin test entry point `__runDangerousModsForTest` consistent across Tasks 2 and 3.
- `injectBridgeFiles` and `patchMainApplicationKt` referenced consistently in production and test paths.
