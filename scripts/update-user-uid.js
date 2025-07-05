const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} = require('firebase/firestore');

// Firebase config (use your actual config)
const firebaseConfig = {
  apiKey: 'AIzaSyCmAtkajAPMupjMKe6wllYmJtXPO-HjqBM',
  authDomain: 'challenger-events.firebaseapp.com',
  projectId: 'challenger-events',
  storageBucket: 'challenger-events.firebasestorage.app',
  messagingSenderId: '533083359503',
  appId: '1:533083359503:web:6b1cf139085d604b08967a',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateUserWithUid(email, firebaseUid) {
  try {
    // Find the user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ User not found with email:', email);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log('Found user:', userData);

    // Update the user with the Firebase UID
    await updateDoc(doc(db, 'users', userDoc.id), {
      uid: firebaseUid,
    });

    console.log('✅ Successfully updated user with Firebase UID');
    console.log('User ID:', userDoc.id);
    console.log('Email:', email);
    console.log('Firebase UID:', firebaseUid);
    console.log('Role:', userData.role);
  } catch (error) {
    console.error('❌ Error updating user:', error);
  }
}

// Usage: node scripts/update-user-uid.js <email> <firebase-uid>
const email = process.argv[2];
const firebaseUid = process.argv[3];

if (!email || !firebaseUid) {
  console.log('Usage: node scripts/update-user-uid.js <email> <firebase-uid>');
  console.log('');
  console.log('To find your Firebase UID:');
  console.log('1. Go to Firebase Console > Authentication > Users');
  console.log('2. Find your user and copy the UID');
  console.log('');
  console.log('Example: node scripts/update-user-uid.js user@example.com abc123def456');
  process.exit(1);
}

updateUserWithUid(email, firebaseUid);
