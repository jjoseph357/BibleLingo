import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const isFirebaseConfigured = 
  typeof process.env.EXPO_PUBLIC_FIREBASE_API_KEY === "string" && 
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== "" && 
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== "demo-api-key";

let app: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "biblelingo.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "biblelingo",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "biblelingo.appspot.com",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "demo-sender",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "demo-app-id"
  };
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { app, db };
