import { initializeApp, getApps, getApp } from "firebase/app";

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

if (!apiKey || !projectId) {
  throw new Error(
    "Missing required Firebase configuration!\n" +
    "Please define EXPO_PUBLIC_FIREBASE_API_KEY and EXPO_PUBLIC_FIREBASE_PROJECT_ID in your .env file."
  );
}

export const firebaseConfig = {
  apiKey,
  projectId,
  storageBucket: storageBucket || `${projectId}.appspot.com`,
  messagingSenderId: messagingSenderId || "",
  appId: appId || "",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
