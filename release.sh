#!/usr/bin/env bash
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh v1.0.10"
  exit 1
fi

ANDROID_HOME="/c/Users/tomho/AppData/Local/Android/Sdk"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEYSTORE="$SCRIPT_DIR/thaiid-release.keystore"
APK="android/app/build/outputs/apk/release/app-release.apk"

# Source all env vars from .env.local
set -a
source "$SCRIPT_DIR/.env.local"
set +a

if [ -z "$KEYSTORE_PASSWORD" ]; then
  echo "Error: KEYSTORE_PASSWORD not found in .env.local"
  exit 1
fi
if [ -z "$EXPO_PUBLIC_GEMINI_API_KEY" ]; then
  echo "Error: EXPO_PUBLIC_GEMINI_API_KEY not found in .env.local"
  exit 1
fi

# Strip leading 'v' to get semver (v1.0.14 → 1.0.14)
SEMVER="${VERSION#v}"

echo "==> Bump version to $SEMVER"
node -e "
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.expo.version = '$SEMVER';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
"

echo "==> Commit version bump"
git add app.json
git commit -m "Bump version to $SEMVER"

echo "==> Prebuild"
ANDROID_HOME="$ANDROID_HOME" npx expo prebuild --platform android --no-install

echo "==> Build APK"
rm -rf android/app/build/generated/assets/createBundleReleaseJsAndAssets
cd android
ANDROID_HOME="$ANDROID_HOME" ./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$KEYSTORE" \
  -Pandroid.injected.signing.store.password="$KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias=thaiid \
  -Pandroid.injected.signing.key.password="$KEYSTORE_PASSWORD"
cd ..

echo "==> Tag & release $VERSION"
git tag "$VERSION"
git push origin master
git push origin "$VERSION"
gh release create "$VERSION" "$APK" \
  --title "Thai ID $VERSION" \
  --notes "Thai National ID Card viewer — $VERSION"

echo "==> Done! Obtainium will pick up $VERSION shortly."
