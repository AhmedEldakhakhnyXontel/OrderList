/**
 * The app's data module, configured from the public Firebase environment variables.
 * Created on first use, never at module scope: web is server-rendered.
 */

import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { createFirestoreData, type FirestoreData } from '@/data/firestore-data';

let appData: FirestoreData | undefined;

export function getAppData() {
  if (!appData) {
    // Reuse the app if Fast Refresh re-ran this module.
    const app =
      getApps()[0] ??
      initializeApp({
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      });
    // Firestore's default cache is memory-only: online only, no persistent offline cache.
    appData = createFirestoreData(getFirestore(app), () => new Date());
  }
  return appData;
}
