# Learning notes

Questions that came up while building OrderList, and what the answers turned out to be.

## Firebase setup (OrderList-df2.2, 2026-11-02)

### Does EAS need `.env` committed?

No. Gitignored `.env` files aren't uploaded to EAS Build, but EAS has its own environment variables (expo.dev dashboard or `eas env:*`), and each service reads them:

- **EAS Build**: the `environment` field on a build profile in `eas.json`
- **EAS Update**: `eas update --environment <name>`
- **EAS Hosting**: `eas deploy --environment <name>`
- **Local dev**: `eas env:pull --environment <name>` writes a local env file, which stays gitignored. EAS is the one source of truth.

Details that matter:

- `EXPO_PUBLIC_*` variables are inlined into the app bundle, so they're public anyway. Give them **plain text** or **sensitive** visibility, not **secret**: secret variables can't be pulled and aren't readable during `eas update`.
- Variables can be set per **account** (shared by every project in it) or per **project**. App-specific values like the Firebase config belong at project level, which needs the app linked to EAS first (`eas init`).
- The Expo docs disagree on whether `env:pull` writes `.env` or `.env.local`, so `.gitignore` covers both.

Source: https://docs.expo.dev/eas/environment-variables/

### Why register a Firebase *web* app, not an Android app?

The app uses the **Firebase JS SDK** on both web and Android. The JS SDK is initialized with a web app's config (`apiKey`, `projectId`, `appId`), and the same JavaScript runs inside the Android app, talking to Firestore over the network like a browser does. One web registration serves both platforms.

An Android registration produces a `google-services.json` for the *native* SDKs (React Native Firebase), which this app doesn't use. It would only be needed for native features such as push through Firebase Cloud Messaging.

Of the web config, Firestore only needs `apiKey`, `projectId` and `appId`; the other fields are for Auth, Storage and messaging.

### Why not React Native Firebase?

- **No web support.** OrderList must run in the browser. React Native Firebase would mean two Firestore implementations (native on Android, JS SDK on web), a doubled data module, and emulator tests that cover only one of them.
- **Expo recommends the JS SDK for universal apps**: one SDK, one data module, the same behavior everywhere.
- **Its strengths are native-only features** (Crashlytics, Cloud Messaging, native Analytics, native offline persistence). v1 is online only with no notifications, so none apply.
- **Setup cost**: `google-services.json`, config plugins and a development build. The JS SDK is plain JavaScript and works in Expo Go.

The JS SDK's weak spots on React Native are offline persistence and Auth persistence. The spec avoids both (online only, no Firebase Auth); revisit the choice if either comes back.

### Which Java does the Firestore emulator need?

**JDK 21 or newer** with firebase-tools 15+. The Emulator Suite install page still says "JDK 11 or higher", but firebase-tools v15.0.0 says: "Removed support for running emulators with Java versions prior to 21." Trust the CLI's release notes over the docs page. The project uses firebase-tools 15.34.2, so Java 17 is not enough.

Sources: https://github.com/firebase/firebase-tools/releases/tag/v15.0.0, https://firebase.google.com/docs/emulator-suite/install_and_configure

### Why firebase-tools as a dev dependency, not a global install?

The version is pinned in `package-lock.json`, it runs with `npx firebase`, and the emulator test script can rely on it being there.
