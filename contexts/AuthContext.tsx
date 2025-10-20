'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, getCurrentUser } from '../lib/firebase-auth';
import { getUserByEmail } from '../lib/firestore';

interface AuthUser {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'COMPETITOR' | 'VIEWER';
  bodyweight?: number | null;
  dateOfBirth?: Date | null;
  sex?: 'M' | 'F' | null;
  organizationId?: string;
  gymId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean; // Add this to track if auth has been initialized
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser && firebaseUser.email) {
        try {
          const userData = await getUserByEmail(firebaseUser.email);
          if (userData) {
            setUser({
              id: userData.id,
              uid: firebaseUser.uid,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              bodyweight: userData.bodyweight,
              dateOfBirth: userData.dateOfBirth,
              sex: userData.sex,
              organizationId: userData.organizationId,
              gymId: userData.gymId,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
};
