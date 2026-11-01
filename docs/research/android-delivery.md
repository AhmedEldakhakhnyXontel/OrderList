# How do Members get OrderList on Android phones?

Ticket: OrderList-yvz.3. Researched 2026-11-01 against Expo SDK 58 (`expo ~58.0.22`, `expo-router ~58`, `web.output: "server"`). Terms follow GLOSSARY.md.

Context: web + Android only, no iOS. Small internal team, loose security. The cheapest and simplest option wins.

## Recommendation

**Ship no native Android build in v1.** Members open the OrderList web app in Chrome on their phone and add it to the home screen. Make the site installable with a web manifest linked from `src/app/+html.tsx`, and skip the service worker.

Why:

- Web is already a v1 target, so there is one codebase and one deploy. Phones get every change the next time the page loads, with no build, no install and no update step.
- It costs nothing beyond hosting the web app, which is needed anyway. There is no Google Play fee, no EAS build quota and no EAS Update limit.
- There is no sideloading security warning, no Play account and no 2027 Android developer-verification exposure (see option A).
- Nothing in the v1 product decisions (OrderList-yvz.1) needs native-only features.

Fallback if a native app is wanted later: option A (internal-distribution APK plus EAS Update). Option C (Play internal testing) is only worth it if someone already has a Play developer account.

## Options compared

| | A. EAS internal-distribution APK | B. Web app on home screen (PWA) | C. Play Console internal testing |
|---|---|---|---|
| Setup effort | `eas.json` profile with `"distribution": "internal"`, run an EAS build, share the link. EAS creates the keystore. | Add `public/manifest.json`, link it in `src/app/+html.tsx`, serve over HTTPS. | $25 Play account, create the app in Play Console, Google Service Account key for EAS Submit, AAB build, tester email list. |
| Cost | Free plan: 15 Android builds/month, EAS Update to 1K MAUs. | $0 beyond web hosting (EAS Hosting free plan: 100,000 requests/month). | US$25 one-time, plus EAS builds as in A. |
| How Members install | Download the APK from a link and accept the warning for apps not from the Play Store. | Open the URL in Chrome, then "Add to home screen" or the install prompt. | Join through an opt-in link with a Google account, then install from the Play Store. |
| How updates reach phones | JS/asset changes: EAS Update, applied on the next app restart. Native changes: new APK, reinstalled by hand. | Next page load. Nothing to do. | JS/asset changes: EAS Update. Native changes: new AAB, which Play delivers within minutes. |
| Limits / risks | Sideload warning. Google developer verification goes global in 2027. | Without a service worker there is no offline use (fine here: the app needs the server anyway). | Max 100 internal testers. Production would need a 12-tester, 14-day closed test (not needed for internal). |

## Findings by option

### A. EAS internal-distribution APK (sideload)

- Android internal distribution produces an APK, because "AAB (Android app bundle) binaries of your app must be distributed through the Play Store". APKs "can be installed directly to an Android device over USB, by downloading the file over the web or through an email or chat app". Setting `"distribution": "internal"` on a build profile switches the default output from AAB to APK. EAS Build creates or reuses the keystore. The docs give no Android device limit. [Expo: Internal distribution](https://docs.expo.dev/build/internal-distribution/)
- The free plan includes "15 Android and 15 iOS builds" per month and EAS Update to "1K MAUs". The cheapest paid plan (Starter) is $19/month. [Expo pricing](https://expo.dev/pricing)
- EAS Update ships only "non-native pieces (such as JS, styling, and images)" and uses runtime versions so updates only reach compatible builds. [Expo: EAS Update](https://docs.expo.dev/eas-update/introduction.md) In SDK 58, `updates.checkAutomatically` defaults to `ON_LOAD`: "If an update is available, it downloads the update and applies it the next time the app is restarted." expo-updates lists Android, iOS and tvOS; web is not supported. [Expo SDK 58: Updates](https://docs.expo.dev/versions/v58.0.0/sdk/updates/)
- **Risk: Android developer verification.** From 30 September 2026, apps installed on certified Android 7+ devices in Brazil, Indonesia, Singapore and Thailand need a verified developer, and this expands "globally for all apps on certified Android devices in 2027". Limited-distribution accounts let "students, teachers, and hobbyists ... share apps with up to 20 devices without a government-issued ID or registration fee". "ADB workflow and experience stays the same", and an "advanced flow" lets users sideload unregistered apps with extra safeguards. [Android developer verification](https://developer.android.com/developer-verification), [guides](https://developer.android.com/developer-verification/guides) So sideloaded APKs will need either developer registration or extra steps on every phone from 2027.

### B. Web app installed to the home screen (PWA)

- Expo's PWA guide: put `public/manifest.json` in place with `short_name`, `name`, 192px and 512px `icons`, `start_url`, `display`, `theme_color` and `background_color`. For static and server output, add `<link rel="manifest" href="/manifest.json" />` in `src/app/+html.tsx`. A service worker (Workbox) is optional, and the guide warns: "Be careful adding service workers as they are known to cause unexpected behavior on web." [Expo: Progressive web apps](https://docs.expo.dev/guides/progressive-web-apps.md)
- Chrome's install criteria: served over HTTPS, a manifest with `name`/`short_name`, 192px and 512px icons, `start_url`, and `display` set to `standalone` (or similar). Also, "Users can install your web app even if it doesn't meet the PWA installability criteria" by using the browser menu. [web.dev: Install criteria](https://web.dev/articles/install-criteria) So even a bare site can go on the home screen. The manifest just makes it open full-screen with the right icon and name.
- With `web.output: "server"`, the web app needs a server host. EAS Hosting "fully supports API routes ... when using the `server` output mode" and deploys with `eas deploy`. Custom domains need a paid plan. The free plan includes 100,000 requests/month. [Expo: EAS Hosting](https://docs.expo.dev/eas/hosting/introduction.md), [Expo pricing](https://expo.dev/pricing) Choosing the host belongs to OrderList-yvz.5.
- Repo state today: neither `public/` nor `src/app/+html.tsx` exists yet, so the work is one manifest file, icons and a `+html.tsx`.

### C. Google Play Console internal testing

- Play developer account: "There is a US$25 one-time registration fee." [Play Console Help: register](https://support.google.com/googleplay/android-developer/answer/6112435)
- Internal testing allows up to 100 testers, invited by an email list and an opt-in link. Testers need a Google account. A new AAB "becomes available to testers within minutes". "Internal tests might not be subject to standard Play policy or security reviews." [Play Console Help: internal testing](https://support.google.com/googleplay/android-developer/answer/9845334)
- New personal accounts need "a minimum of 12 testers who have been opted in continuously for at least 14 days" in a closed test before production. Internal testing does not count toward that, but it is usable without it. [Play Console Help: testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- EAS Submit needs the app created in Play Console, a Google Service Account key, and an `.aab`. An APK "cannot be submitted to the Google Play Store". [Expo: Submit to Google Play](https://docs.expo.dev/submit/android.md)
- Apps on Play are registered automatically for developer verification ("Google Play automatically registers 99% of apps"). [Android developer verification](https://developer.android.com/developer-verification)

## Is a native Android build worth it at all?

Not for v1. Every product decision in OrderList-yvz.1 (typing a name, the Order List lifecycle, adding Items with type-ahead from the Catalog, Admin views) is ordinary UI that the web build already covers. A native build would add an EAS build pipeline, a second update channel (EAS Update does not cover web) and an install step on every phone, for no feature Members need.

Revisit if a later idea needs something the phone browser can't do well. That is unverified here and would need its own research.

## Open questions / not verified

- Exact Android developer-verification fees, and whether an internal team qualifies for a limited-distribution account. The pages say "potential fees" without numbers.
- Whether Chrome on Android still requires a service worker for the automatic install prompt. web.dev's criteria page doesn't mention it, and manual "Add to home screen" works regardless.
- Inference, not checked against the docs: a native build would also need an absolute backend URL for API routes, while the web app calls them on its own origin.
