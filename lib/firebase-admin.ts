import * as admin from 'firebase-admin';

let appInitialized = false;

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!privateKey) {
      console.warn('⚠️ FIREBASE_PRIVATE_KEY not set - Firebase Admin will not be initialized');
    } else {
      // Handle different private key formats
      let processedKey = privateKey;

      // Replace escaped newlines
      processedKey = processedKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: processedKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      appInitialized = true;
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
} else {
  appInitialized = true;
}

export const adminStorage = appInitialized ? admin.storage() : null;
export default admin;
