import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
export { db };

// Types
export interface User {
  id: string;
  uid?: string;
  name?: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'COMPETITOR' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
  adminIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  maxScore?: number;
  unit?: string;
  order: number;
  createdAt: Date;
}

export interface Score {
  id: string;
  userId: string;
  eventId: string;
  activityId: string;
  value: number;
  notes?: string;
  submittedAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'CAPTAIN' | 'MEMBER';
  joinedAt: Date;
}

export interface Participation {
  id: string;
  userId: string;
  eventId: string;
  joinedAt: Date;
}

// User functions
export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
  const userRef = collection(db, 'users');
  const docRef = await addDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...userData };
};

export const getUser = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as User;
  }
  return null;
};

export const getUserByEmail = async (email: string) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }
  return null;
};

export const getUserByUid = async (uid: string) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('uid', '==', uid), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }
  return null;
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Event functions
export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
  const eventRef = collection(db, 'events');
  const docRef = await addDoc(eventRef, {
    ...eventData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...eventData };
};

export const getEvent = async (eventId: string) => {
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  if (eventSnap.exists()) {
    return { id: eventSnap.id, ...eventSnap.data() } as Event;
  }
  return null;
};

export const getEventByCode = async (code: string) => {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef, where('code', '==', code), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Event;
  }
  return null;
};

export const getEventsByAdmin = async (adminId: string) => {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef, where('adminIds', 'array-contains', adminId));
  const querySnapshot = await getDocs(q);
  const events = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Event[];

  // Sort by createdAt on the client side to avoid index requirement
  return events.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });
};

export const getEventsByParticipant = async (userId: string) => {
  const participationsRef = collection(db, 'participations');
  const q = query(participationsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const eventIds = querySnapshot.docs.map((doc) => doc.data().eventId);

  if (eventIds.length === 0) return [];

  // Fetch events by their document IDs
  const events: Event[] = [];
  for (const eventId of eventIds) {
    const event = await getEvent(eventId);
    if (event) {
      events.push(event);
    }
  }

  // Sort by createdAt (most recent first)
  return events.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });
};

// Activity functions
export const createActivity = async (activityData: Omit<Activity, 'id' | 'createdAt'>) => {
  const activityRef = collection(db, 'activities');
  const docRef = await addDoc(activityRef, {
    ...activityData,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...activityData };
};

export const getActivitiesByEvent = async (eventId: string) => {
  const activitiesRef = collection(db, 'activities');
  const q = query(activitiesRef, where('eventId', '==', eventId), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Activity[];
};

// Score functions
export const createScore = async (scoreData: Omit<Score, 'id' | 'submittedAt' | 'updatedAt'>) => {
  const scoreRef = collection(db, 'scores');
  const docRef = await addDoc(scoreRef, {
    ...scoreData,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...scoreData };
};

export const updateScore = async (scoreId: string, updates: Partial<Score>) => {
  const scoreRef = doc(db, 'scores', scoreId);
  await updateDoc(scoreRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const getScoresByEvent = async (eventId: string) => {
  const scoresRef = collection(db, 'scores');
  const q = query(scoresRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Score[];
};

export const getScoresByUserAndEvent = async (userId: string, eventId: string) => {
  const scoresRef = collection(db, 'scores');
  const q = query(scoresRef, where('userId', '==', userId), where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Score[];
};

// Real-time listeners
export const subscribeToEventScores = (eventId: string, callback: (scores: Score[]) => void) => {
  const scoresRef = collection(db, 'scores');
  const q = query(scoresRef, where('eventId', '==', eventId));
  return onSnapshot(q, (snapshot) => {
    const scores = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Score[];
    callback(scores);
  });
};

// Utility functions
export const generateEventCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const isAdmin = (role: string): boolean => {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};

export const isSuperAdmin = (role: string): boolean => {
  return role === 'SUPER_ADMIN';
};

export const updateEvent = async (eventId: string, updates: Partial<Event>) => {
  const eventRef = doc(db, 'events', eventId);
  await updateDoc(eventRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  return { id: eventId, ...updates };
};

export const deleteEvent = async (eventId: string) => {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
};

// Participation functions
export const createParticipation = async (
  participationData: Omit<Participation, 'id' | 'joinedAt'>,
) => {
  const participationRef = collection(db, 'participations');
  const docRef = await addDoc(participationRef, {
    ...participationData,
    joinedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...participationData };
};

export const getParticipationsByUser = async (userId: string) => {
  const participationsRef = collection(db, 'participations');
  const q = query(participationsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Participation[];
};

export const getParticipationsByEvent = async (eventId: string) => {
  const participationsRef = collection(db, 'participations');
  const q = query(participationsRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Participation[];
};

export const checkUserParticipation = async (userId: string, eventId: string) => {
  const participationsRef = collection(db, 'participations');
  const q = query(
    participationsRef,
    where('userId', '==', userId),
    where('eventId', '==', eventId),
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};
