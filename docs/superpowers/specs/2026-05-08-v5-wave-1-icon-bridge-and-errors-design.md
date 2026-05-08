# v5.0.0 Solidness Sweep — Wave 1: Icon Bridge & Error Discipline

**Date:** 2026-05-08
**Target release:** v4.0.5
**Branch:** `wave-1-bridge-and-errors`

## Context

v5.0.0 is a four-wave sweep to bring the Digital ID app to industry-standard solidness. Wave 1 (this spec) ships v4.0.5 with the icon bug fixed, silent error swallowing replaced by a single reporter, a non-blocking restart hint, dead UI removed, and a minimal Vitest scaffold. Subsequent waves get their own specs:

- **Wave 2** (planned, v4.1.0): Generation flow refactor — extract `handleSaveGenerate` into a service, AbortController, NetInfo, structured progress.
- **Wave 3** (planned, v4.2.0): Pixel 10 / Android 14+ polish — predictive back, edge-to-edge, haptics, themed icons, retry UX.
- **Wave 4** (planned, v5.0.0): Infrastructure — ESLint, GitHub Actions CI, Edge Function rate limiting, Sentry.

## Problem statement

Three concrete problems Wave 1 fixes:

1. **Icon bridge missing in production.** APK inspection of v4.0.4 confirmed `DynamicIconModule` and `DynamicIconPackage` are absent from all three dex files. The `withDynamicIcon` config plugin only writes `AndroidManifest.xml` activity-aliases and `strings.xml` entries; the Java bridge has always lived as untracked files in `android/`, which `.gitignore` excludes (`/android` in `.gitignore`). The v4.0.4 macOS build had no Java files to compile, so the runtime call to `NativeModules.DynamicIconModule.setIcon(code)` resolves to `undefined` and silently no-ops.
2. **Silent error swallowing in 16 places.** `.catch(console.warn)` and `catch {}` patterns hide real failures. The most damaging case is `ProfileContext.tsx:109` — a failed AsyncStorage write to the profile is invisible until the app reloads with stale data.
3. **Country-switch UX leaves the user confused.** Even with the bridge fixed, Android requires app relaunch for the launcher to re-resolve activity-aliases. The user has no hint that anything will change.

Plus three smaller items bundled with the same release:
- Dead "Coming Soon" alerts on PIN and Privacy settings (`settings.tsx:484-485`).
- Dead `hasTextChanges` computation (`settings.tsx:246-250`).
- No way to verify the icon bridge survives builds — needs a contract test that runs against the built APK.

## Goals

- v4.0.4 → v4.0.5 dynamic icon switching works end-to-end on a Pixel 10 Pro.
- A regression that strips the native bridge from the APK fails the build, not the user's phone.
- Errors that lose user data become visible to the user. Best-effort errors stay quiet but logged with structure.
- Every silent `.catch(console.warn)` is either upgraded to `reportError` or deleted.
- Test scaffold (Vitest) is in place for plugin and script tests; component testing is deferred to Wave 4.

## Non-goals

- Refactoring `handleSaveGenerate` (Wave 2).
- Touching the Gemini generation flow (Wave 2).
- Adding haptics, predictive back, edge-to-edge (Wave 3).
- ESLint, CI, Sentry integration (Wave 4).
- React Native component tests (Wave 4).
- Translation churn — `t('settings.pin')` and `t('settings.privacy')` keys stay in i18n files until a feature actually replaces them.

## Architecture

Six independent units, each with one purpose. Each unit can be implemented and tested without changing the others.

### Unit 1 — `plugins/withDynamicIcon.js` extension

The plugin gains a third step (after the existing manifest-edit and strings.xml-inject steps) that runs via `withDangerousMod` on the `android` platform.

**Inputs:** `config.android.package` (e.g., `com.tomhoel.thaiid`), `config.modRequest.platformProjectRoot`.

**Outputs:**
1. `<platformRoot>/app/src/main/java/<package>/DynamicIconModule.java` — written from a JS template literal embedded in the plugin. Package declaration is templated from `config.android.package`.
2. `<platformRoot>/app/src/main/java/<package>/DynamicIconPackage.java` — same approach.
3. `<platformRoot>/app/src/main/java/<package>/MainApplication.kt` — modified in place. Idempotent regex match for `add(DynamicIconPackage())`; if present, no edit. If absent, locate `PackageList(this).packages.apply {` and inject `add(DynamicIconPackage())` on the next line. If the regex doesn't match (Expo template change), throw a clear error that lists the file path so future maintainers see it loudly.

**Why JS templates over a `templates/` directory:** Java is ~50 lines total; one-file plugin makes the bridge readable in one pass. Trade-off: editor syntax highlighting is lost, accepted.

**COUNTRIES list:** stays as the single source of truth in the plugin (`['th', 'sg', 'br', 'us', 'vn']`). Same array is passed to the Java template — adding a country requires editing one place.

### Unit 2 — `src/utils/reportError.ts`

Single function `reportError(scope: string, error: unknown, opts?: ReportOptions)`. Replaces every silent catch in the codebase.

**Behavior:**
- Always logs `[<scope>] <message>` plus stringified error to `console.error` (was `console.warn` — bumped to indicate severity).
- If `opts.userVisible === true`, displays a Snackbar via the new `SnackbarContext`. Snackbar text comes from `opts.toast` if provided, otherwise a generic "Something went wrong. Please try again." message.
- Returns `void`. No throws.

**Future hook (Wave 4):** Sentry import + `Sentry.captureException(error, { tags: { scope } })`. The seam is in place from Wave 1; the implementation is empty.

**Sweep targets:**
| Location | Severity | userVisible |
|---|---|---|
| `ProfileContext.tsx:109` (profile save) | Critical | true |
| `settings.tsx:178` (cross-country sync) | Critical | true (`'Could not sync to all countries.'`) |
| `settings.tsx:185-186` (clear images/history on revert) | Best-effort | false |
| `settings.tsx:203` (reset other-country profile) | Best-effort | false |
| `settings.tsx:389, 419` (saveVersion in generation) | Best-effort | false |
| `LanguageContext.tsx:39, 54, 60` (lang save) | Best-effort | false |
| `ThemeContext.tsx:39` (theme save) | Best-effort | false |
| `CountryContext.tsx:87` (country save) | Best-effort | false |
| `versionHistory.ts:104, 129, 141` (file delete on cleanup) | Best-effort | false |
| `settings.tsx:98, 103` (notif/sync prefs save) | Best-effort | false |
| `DynamicIcon.ts:23` | Critical | true (`'Icon switching unavailable in this build.'`) — **also rethrows** so caller sees the failure |

### Unit 3 — `src/components/Snackbar.tsx` + `src/context/SnackbarContext.tsx`

Tiny in-app Snackbar. No new dependency.

- `SnackbarProvider` wraps the app inside `_layout.tsx` (between `BiometricProvider` and `AppShell`).
- Exposes `useSnackbar()` returning `{ show: (text: string, opts?: { durationMs?: number }) => void }`.
- Snackbar component: absolute-positioned bottom container, slides up via `react-native-reanimated`, auto-dismisses after 4000ms (configurable). Material-3-flavored: dark surface, light text, no action button (per Wave 1 design decision).
- Styled with `useTheme()` colors so it matches dark/light theme.

### Unit 4 — Restart-to-apply hint

After `setAppIcon(code)` resolves successfully in the country picker `onSelect` (`settings.tsx:500`), call `snackbar.show('Icon will update on next app open.')`. No restart button.

If `setAppIcon` throws (Unit 1 + Unit 2 conspire to make this loud), the country switch still completes (so the user's country preference is honored), but a different snackbar fires: `'Icon switching unavailable in this build.'`. This separation is intentional — the country preference is a JS concern; the icon swap is a native concern; one failing should not block the other.

### Unit 5 — Cleanup

- Delete `<Item ... label={t('settings.pin')} ... />` at `settings.tsx:484`.
- Delete `<Item ... label={t('settings.privacy')} ... />` at `settings.tsx:485`.
- Delete the `hasTextChanges` block at `settings.tsx:246-250`.
- Audit `selectedPhotoMime` use — it's read at `settings.tsx:296-297, 313` for data URI construction, so it stays.
- The `t('settings.pin')` and `t('settings.privacy')` translation keys are kept in i18n files for now (no orphan-key cleanup until a follow-up).

### Unit 6 — Test scaffold

**Vitest setup:**
- `npm i -D vitest` + tiny `vitest.config.ts` (Node environment, default).
- `package.json` script: `"test": "vitest run"`.

**Plugin test (`tests/plugins/withDynamicIcon.test.js`):**
- Builds a mock Expo `config` object with `android.package: 'com.example.app'` and a writable temp `platformProjectRoot`.
- Runs the plugin's three steps in sequence.
- Asserts:
  - `DynamicIconModule.java` exists at the expected path with `package com.example.app;`.
  - `DynamicIconPackage.java` exists with the same package.
  - `MainApplication.kt` (pre-seeded with a minimal Expo template) contains exactly one occurrence of `add(DynamicIconPackage())`.
  - Running the plugin twice does not produce duplicates (idempotent).

**APK contract test (`scripts/check-apk.sh`):**
- Inputs: path to a built APK.
- Unzips to a tempdir, scans each `classes*.dex` file via `grep -a` for `DynamicIconModule` and `DynamicIconPackage`.
- Exits 0 if both found; exits 1 with a clear error message if either is missing.
- Wired into `release.sh` between `assembleRelease` and `gh release create`. If the script fails, release.sh aborts before tagging.

## Data flow

The country-switch path:

```
User taps country in picker
  -> onSelect(k)
       -> setCountry(k)            // CountryContext: AsyncStorage.setItem, may reportError
       -> setAppIcon(k)            // throws if NativeModules.DynamicIconModule missing
            -> on success: snackbar.show('Icon will update on next app open.')
            -> on throw:   snackbar.show('Icon switching unavailable in this build.')
       -> setPicker(null)           // close the picker UI
```

The icon-switch native side (unchanged behavior, only the wiring is now reliable):

```
DynamicIconModule.setIcon(countryCode)
  -> for each country in COUNTRIES:
       PackageManager.setComponentEnabledSetting(
         ComponentName(PACKAGE, ".DynamicIcon_<code>"),
         isTarget ? ENABLED : DISABLED,
         DONT_KILL_APP
       )
  -> resolve(true)
```

## Error handling

Three failure classes and their responses:

| Class | Example | Response |
|---|---|---|
| User data at risk | Profile save fails | `reportError(scope, e, { userVisible: true, toast: 'Could not save profile.' })`. App stays usable. |
| Best-effort persistence | Theme save fails, file cleanup fails | `reportError(scope, e)`. Silent to user, structured log for debugging. |
| Native bridge missing | `DynamicIconModule` undefined | `reportError` + `throw`. Caller catches and shows Snackbar. |

Anti-patterns explicitly removed: `.catch(console.warn)` chains, empty `catch {}` blocks (in app code — `versionHistory.ts` `try { delete } catch {}` blocks during cleanup are kept since file-delete failures during garbage collection are genuinely best-effort and add noise to logs).

## Testing

**Pre-merge (manual):**
1. `npm test` — Vitest plugin test passes.
2. `./release.sh v4.0.5` on macOS — completes without `check-apk.sh` failing.
3. Install the resulting APK on Pixel 10 Pro.
4. Open app → Settings → Country → switch from TH to VN. Snackbar appears with restart-hint copy.
5. Long-press app icon → drag to home screen / open recent apps and re-open. Verify launcher icon updates to Vietnam variant.
6. Switch back to TH. Verify same flow works.
7. Force-quit app, force-stop in Android settings, change country, reopen — verify still works.

**Regression-prevention:**
- `check-apk.sh` will fail any future build that loses the bridge. Same diagnostic technique as the original investigation.
- `withDynamicIcon.test.js` will fail any future plugin change that breaks the package registration injection.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Future Expo SDK changes the `MainApplication.kt` template, breaking the regex injection | Plugin throws a clear error pointing to the file and the regex it expected. The unit test pre-seeds the current template, so a template change shows up locally before release. |
| `withDangerousMod` runs in unexpected order relative to other plugins that also touch `MainApplication.kt` | Our step is the last `withDangerousMod` in this plugin, runs after manifest/strings; if a future plugin we add also patches `MainApplication.kt`, plugin order in `app.json` becomes load-bearing — call this out in the plugin's top-level comment. |
| Snackbar overlaps modal content in the demo profile sheet | Snackbar z-index sits above the modal layer. Verified manually during pre-merge testing. |
| Adding the snackbar provider somewhere wrong in the context tree breaks theme/language access | `SnackbarProvider` goes inside `ThemeProvider` and `LanguageProvider`, outside `AppShell`. `useSnackbar` only depends on its own context, no cross-context coupling. |
| Throwing from `DynamicIcon.ts` instead of silent fallthrough breaks dev builds without the native module (e.g., Expo Go) | The `Platform.OS !== 'android'` early return remains. iOS dev builds and Expo Go are unaffected — the new throw only fires on Android when the bridge file is missing, which is the bug we're fixing. |

## Rollout

1. Branch `wave-1-bridge-and-errors` off master.
2. Implement units in order: 1 → 6 → 2 → 3 → 4 → 5 (plugin first since it's the riskiest, tests after, then the error reporter that everything else depends on, then Snackbar, then UX wiring, then cleanup).
3. Run `npm test` and full manual test pass on Pixel 10 Pro.
4. Merge to master.
5. `./release.sh v4.0.5`. The new `check-apk.sh` runs as part of it.
6. Obtainium picks up v4.0.5 within ~15 minutes.

**Rollback:** if v4.0.5 introduces a regression, `git revert` the merge commit and re-tag v4.0.6 from master. Edge Function is untouched in Wave 1, so no server-side rollback needed.
