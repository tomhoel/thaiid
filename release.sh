#!/usr/bin/env bash
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh v1.0.10"
  exit 1
fi

ANDROID_HOME="/c/Users/tomho/AppData/Local/Android/Sdk"
KEYSTORE="$(dirname "$0")/thaiid-release.keystore"
KEYPASS="REDACTED_PASSWORD"
APK="android/app/build/outputs/apk/release/app-release.apk"

echo "==> Prebuild"
ANDROID_HOME="$ANDROID_HOME" npx expo prebuild --platform android --no-install

echo "==> Build APK"
cd android
ANDROID_HOME="$ANDROID_HOME" \
EXPO_PUBLIC_GEMINI_API_KEY="$(grep EXPO_PUBLIC_GEMINI_API_KEY "$(dirname "$0")/.env.local" | cut -d= -f2)" \
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$KEYSTORE" \
  -Pandroid.injected.signing.store.password="$KEYPASS" \
  -Pandroid.injected.signing.key.alias=thaiid \
  -Pandroid.injected.signing.key.password="$KEYPASS"
cd ..

echo "==> Tag & release $VERSION"
git tag "$VERSION"
git push origin master
git push origin "$VERSION"
gh release create "$VERSION" "$APK" \
  --title "Thai ID $VERSION" \
  --notes "Thai National ID Card viewer — $VERSION"

echo "==> Done! Obtainium will pick up $VERSION shortly."
