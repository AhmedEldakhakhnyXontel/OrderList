# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Deploying

The Firebase config lives in EAS environment variables (`development`, `preview` and `production`), never in git. Run these from the repo root after `npx eas-cli@latest login`.

### Redeploy the web app (EAS Hosting)

```bash
npx eas-cli@latest env:pull --environment production   # overwrites .env.local with the production values
npx expo export --platform web                         # re-export before every deploy
npx eas-cli@latest deploy --prod --environment production
```

`EXPO_PUBLIC_` variables are inlined at export time, so the pull must come before the export.

### Build the Android APK (EAS Build)

```bash
npx eas-cli@latest build --platform android --profile preview
```

The `preview` profile in `eas.json` builds an internal-distribution APK with the `preview` environment and the `preview` update channel. Open the install link from the build page on the phone. Rebuild only for native changes (a new native library, an SDK upgrade), and bump `version` in `app.json` first.

### Publish an update (EAS Update)

```bash
npx eas-cli@latest update --channel preview --environment preview --platform android --message "What changed"
```

Installed APKs download it when the app opens and apply it on the next restart. The runtime version follows `version` in `app.json` (`appVersion` policy), so an update reaches only APKs built from the same `version`. EAS Update doesn't cover web: redeploy it instead.

### Deploy the Firestore Security Rules

```bash
npm test                                      # the tests run against these Rules in the emulator
npx firebase deploy --only firestore:rules    # deploys firestore.rules to the .firebaserc default project
```

The Rules were first deployed with OrderList-df2.3.

## Ideas for later

- **Money tracking**: prices, totals, and who owes whom. Deliberately left out of v1.
- **Quantities**: v1 has none; a Member adds the same Item twice to get two.
- **Catalog cleanup**: renaming or deleting misspelled or duplicate Items. v1 has no way to fix the Catalog.
