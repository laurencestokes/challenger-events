import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Auth, getAuth as getFirebaseAuth } from 'firebase/auth';

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

// Only validate in browser runtime during development, not during build
if (typeof window !== 'undefined' && missingVars.length > 0) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Missing Firebase environment variables:', missingVars);
    console.warn('Please check your .env file and ensure all Firebase variables are set.');
    console.warn('The app may not work correctly without these variables.');
  }
}

// Provide fallback values for build time
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase if we have the required config
let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  // Check if we have the minimum required config
  if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreInstance = getFirestore(app);
    authInstance = getFirebaseAuth(app);
  } else {
    console.warn('⚠️ Firebase not initialized - missing required configuration');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
}

// Export the instances with proper null checks
export const db = firestoreInstance!;
export const auth = authInstance!;

export default app;
