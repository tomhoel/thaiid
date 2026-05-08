import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

// Test file uses ESM-style imports; createRequire is the interop bridge
// to load the CJS plugin module (which uses module.exports).
const require = createRequire(import.meta.url);
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
    expect(java).toContain('"th"');
    expect(java).toContain('"vn"');
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
