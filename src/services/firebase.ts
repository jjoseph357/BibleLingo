import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const cleanEnv = (val: any) => typeof val === "string" ? val.replace(/^["']|["']$/g, "") : val;

const cleanedApiKey = cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

export const isFirebaseConfigured = 
  typeof cleanedApiKey === "string" && 
  cleanedApiKey !== "" && 
  cleanedApiKey !== "demo-api-key";

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: cleanedApiKey,
    authDomain: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) || "biblelingo.firebaseapp.com",
    projectId: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) || "biblelingo",
    storageBucket: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) || "biblelingo.appspot.com",
    messagingSenderId: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "demo-sender",
    appId: cleanEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID) || "demo-app-id"
  };
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };
