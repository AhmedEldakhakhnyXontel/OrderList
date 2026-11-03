# Non-functional decisions

Newest first.

## 2026-11-03: EAS Update with the `appVersion` runtime policy; APK on the `preview` profile, web from `production`

**Decision**: `runtimeVersion` uses the `appVersion` policy, not `fingerprint` or a manual string. The APK builds with one `preview` profile in `eas.json` (`distribution: internal`, `environment: preview`, `channel: preview`), and updates go to the `preview` channel with the `preview` environment. The web app is exported and deployed with the `production` environment. `cli.appVersionSource` is `local`.

**Why**: `appVersion` is what `eas update:configure` writes for managed projects (eas-cli 27.3.0), and it gives the same runtime version on the Windows machine that publishes and on the EAS Build server, with nothing to diff. The cost is a manual step: bump `version` before building an APK with native changes. `fingerprint` would track those changes automatically, but a hash mismatch between the two machines would silently stop updates, which is harder to debug. The `preview` environment was filled for this APK in OrderList-df2.11. `appVersionSource: local` keeps today's default behaviour and silences the EAS CLI warning about the missing field.

## 2026-11-02: Jest (jest-expo) inside the Firestore emulator for data module tests

**Decision**: Jest set up per Expo's "Unit Testing with Jest" guide (`jest-expo` preset). `npm test` wraps Jest in `firebase emulators:exec --only firestore`, which starts the Firestore emulator with `firestore.rules` loaded from `firebase.json`, under the offline `demo-orderlist` project. Data module tests opt into Jest's `node` environment and clear the emulator through its data-clear endpoint before each test. No `@firebase/rules-unit-testing`: the plain Firebase JS SDK plus the clear endpoint covers what the tests need.

**Why**: The spec makes the Firestore data module the one test seam, covering both app logic and the real Security Rules, so tests need a real Firestore with those Rules rather than mocks. A `demo-` project can't reach a real Firebase project. The emulator needs JDK 21 or newer on `PATH` (see `docs/learning.md`).
