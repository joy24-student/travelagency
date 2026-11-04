import { initializeApp, getApps, getApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: "AIzaSyDbeyALUsZRIQCH6P_v4wmUACnu955xY1Y",
  projectId: "swapnojatra-c04a0",
  storageBucket: "swapnojatra-c04a0.firebasestorage.app",
  messagingSenderId: "560123613595",
  appId: "1:560123613595:android:b0ebd64bc0c981677d513e",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

