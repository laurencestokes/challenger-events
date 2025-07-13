import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUser } from './firestore';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'COMPETITOR';
}

export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your environment variables.');
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
    throw new Error(errorMessage);
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
): Promise<AuthUser> => {
  try {
    // Check if auth is initialized
    if (!auth) {
      console.error('❌ Firebase Auth not initialized');
      throw new Error('Firebase Auth not initialized. Please check your environment variables.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: name });

    // Send email verification
    await sendEmailVerification(user);

    // Create user document in Firestore
    const userData = await createUser({
      uid: user.uid,
      email: user.email!,
      name: name,
      role: 'COMPETITOR',
      verificationStatus: 'PENDING',
    });

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    } as AuthUser;
  } catch (error: unknown) {
    console.error('❌ Sign up error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
    throw new Error(errorMessage);
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your environment variables.');
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
    throw new Error(errorMessage);
  }
};

export const signOut = async (): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your environment variables.');
  }
  try {
    await firebaseSignOut(auth);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
    throw new Error(errorMessage);
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth?.currentUser || null;
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your environment variables.');
  }
  return onAuthStateChanged(auth, callback);
};

export const sendEmailVerification = async (user?: FirebaseUser) => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your environment variables.');
  }
  try {
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      throw new Error('No user to send verification email to');
    }
    await firebaseSendEmailVerification(currentUser);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send verification email';
    throw new Error(errorMessage);
  }
};

export const isEmailVerified = (user?: FirebaseUser): boolean => {
  if (!auth) {
    return false;
  }
  const currentUser = user || auth.currentUser;
  return currentUser?.emailVerified || false;
};
