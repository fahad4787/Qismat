"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// Public web config for the Firebase project (Firebase console → Project
// settings → Your apps → Web app). These values are not secrets: the
// Firestore rules are what protect the data.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "prizemoney-6d1a7",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";

export const firebaseConfigured = useEmulator || Boolean(config.apiKey && config.appId);

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function firebase() {
  if (cached) return cached;
  const app = getApps().length
    ? getApp()
    : initializeApp(useEmulator ? { ...config, apiKey: config.apiKey ?? "demo-key" } : config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (useEmulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  cached = { app, auth, db };
  return cached;
}
