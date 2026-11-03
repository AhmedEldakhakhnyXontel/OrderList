# Non-functional decisions

Newest first.

## 2026-11-02: Jest (jest-expo) inside the Firestore emulator for data module tests

**Decision**: Jest set up per Expo's "Unit Testing with Jest" guide (`jest-expo` preset). `npm test` wraps Jest in `firebase emulators:exec --only firestore`, which starts the Firestore emulator with `firestore.rules` loaded from `firebase.json`, under the offline `demo-orderlist` project. Data module tests opt into Jest's `node` environment and clear the emulator through its data-clear endpoint before each test. No `@firebase/rules-unit-testing`: the plain Firebase JS SDK plus the clear endpoint covers what the tests need.

**Why**: The spec makes the Firestore data module the one test seam, covering both app logic and the real Security Rules, so tests need a real Firestore with those Rules rather than mocks. A `demo-` project can't reach a real Firebase project. The emulator needs JDK 21 or newer on `PATH` (see `docs/learning.md`).
