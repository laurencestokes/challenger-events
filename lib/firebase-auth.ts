import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: name });

    // Create user document in Firestore
    const userData = await createUser({
      uid: user.uid,
      email: user.email!,
      name: name,
      role: 'COMPETITOR',
    });

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    } as AuthUser;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
    throw new Error(errorMessage);
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
    throw new Error(errorMessage);
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
    throw new Error(errorMessage);
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
