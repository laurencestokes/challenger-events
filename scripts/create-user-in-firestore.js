const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

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

async function createUserInFirestore(email, name, role = 'COMPETITOR') {
  try {
    const userData = {
      email: email,
      name: name,
      role: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const userRef = collection(db, 'users');
    const docRef = await addDoc(userRef, userData);

    console.log('✅ User created successfully in Firestore!');
    console.log('User ID:', docRef.id);
    console.log('Email:', email);
    console.log('Role:', role);

    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating user in Firestore:', error);
    throw error;
  }
}

// Usage: Replace with your actual email and name
const email = process.argv[2];
const name = process.argv[3];
const role = process.argv[4] || 'COMPETITOR';

if (!email) {
  console.log('Usage: node create-user-in-firestore.js <email> [name] [role]');
  console.log('Example: node create-user-in-firestore.js user@example.com "John Doe" ADMIN');
  process.exit(1);
}

createUserInFirestore(email, name, role)
  .then(() => {
    console.log('🎉 User creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to create user:', error);
    process.exit(1);
  });
