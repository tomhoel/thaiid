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
