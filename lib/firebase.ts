import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCmAtkajAPMupjMKe6wllYmJtXPO-HjqBM',
  authDomain: 'challenger-events.firebaseapp.com',
  projectId: 'challenger-events',
  project_id: 'challenger-events',
  storageBucket: 'challenger-events.firebasestorage.app',
  messagingSenderId: '533083359503',
  appId: '1:533083359503:web:6b1cf139085d604b08967a',
  measurementId: 'G-NJW0KYDC9Z',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
