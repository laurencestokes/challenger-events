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
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
export { db, serverTimestamp };

// Types
export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPETITOR';
  bodyweight?: number;
  dateOfBirth?: Date;
  sex?: 'M' | 'F';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION';
  verificationNotes?: string;
  verifiedBy?: string; // Admin ID who verified
  verifiedAt?: unknown; // Can be Date or Firestore timestamp
  createdAt: Date;
  updatedAt: Date;
  publicProfileShowAge?: boolean;
  publicProfileShowBodyweight?: boolean;
  publicProfileShowSex?: boolean;
  publicProfileEnabled?: boolean;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  brief?: string; // Custom brief content for the event
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
  adminIds: string[];
  isTeamEvent: boolean; // Whether this event supports team competition
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST'; // How team scores are calculated
  maxTeamSize?: number; // Maximum number of members per team
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  scoringSystemId?: string; // Reference to scoring system
  maxScore?: number;
  unit?: string;
  reps?: number; // Number of reps for strength exercises (1-10)
  order: number;
  isHidden?: boolean; // Whether this workout is hidden from competitors
  revealedAt?: Date; // When the workout was revealed (null if still hidden)
  createdAt: Date;
  updatedAt?: Date;
}

export interface Score {
  id: string;
  userId: string;
  eventId?: string | null; // Optional or null for personal scores
  activityId: string;
  rawValue: number; // The raw input value (e.g., 180kg)
  calculatedScore: number; // The calculated score from the scoring system
  notes?: string;
  verified: boolean; // New: whether the score is verified
  verifiedAt?: Date; // New: when the score was verified
  verifiedBy?: string; // New: who verified the score (admin id)
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

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  code: string;
  invitedBy: string; // User ID of who sent the invitation
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}

export interface Participation {
  id: string;
  userId: string;
  eventId: string;
  teamId?: string; // Optional team participation
  joinedAt: Date;
}

export interface CompetitionVerification {
  id: string;
  userId: string;
  eventId: string;
  bodyweight: number;
  verifiedBy: string;
  verifiedAt: Date;
  verificationNotes?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
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

  // Filter out undefined values to avoid Firestore errors
  const cleanActivityData = Object.fromEntries(
    Object.entries(activityData).filter(([, value]) => value !== undefined),
  );

  const docRef = await addDoc(activityRef, {
    ...cleanActivityData,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...activityData, createdAt: new Date() };
};

/**
 * Fetch activities for an event, with options for including hidden workouts.
 * @param eventId - The event ID
 * @param options - Options object
 *   - includeHiddenWorkouts: Whether to include hidden workouts (default: false)
 */
export const getActivitiesByEvent = async (
  eventId: string,
  options: { includeHiddenWorkouts?: boolean } = {},
) => {
  const { includeHiddenWorkouts = false } = options;
  const activitiesRef = collection(db, 'activities');
  const q = query(activitiesRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  let activities = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Activity[];

  // Filter out hidden workouts unless explicitly requested
  if (!includeHiddenWorkouts) {
    activities = activities.filter((activity) => !activity.isHidden);
  }

  // Sort by order on the client side to avoid index requirement
  return activities.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getActivity = async (activityId: string) => {
  const activityRef = doc(db, 'activities', activityId);
  const activitySnap = await getDoc(activityRef);
  if (activitySnap.exists()) {
    return { id: activitySnap.id, ...activitySnap.data() } as Activity;
  }
  return null;
};

export const updateActivity = async (activityId: string, updates: Partial<Activity>) => {
  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteActivity = async (activityId: string) => {
  const activityRef = doc(db, 'activities', activityId);
  await deleteDoc(activityRef);
};

export const revealHiddenWorkout = async (activityId: string) => {
  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    isHidden: false,
    revealedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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

export const getScoreByUserActivityAndEvent = async (
  userId: string,
  activityId: string,
  eventId: string,
) => {
  const scoresRef = collection(db, 'scores');
  const q = query(
    scoresRef,
    where('userId', '==', userId),
    where('activityId', '==', activityId),
    where('eventId', '==', eventId),
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Score;
  }
  return null;
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

export const getUserParticipation = async (userId: string, eventId: string) => {
  const participationsRef = collection(db, 'participations');
  const q = query(
    participationsRef,
    where('userId', '==', userId),
    where('eventId', '==', eventId),
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Participation;
  }
  return null;
};

export const updateParticipation = async (
  participationId: string,
  updates: Partial<Participation>,
) => {
  const participationRef = doc(db, 'participations', participationId);
  await updateDoc(participationRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Team functions
export const createTeam = async (teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => {
  const teamRef = collection(db, 'teams');
  const docRef = await addDoc(teamRef, {
    ...teamData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...teamData };
};

export const getTeam = async (teamId: string) => {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (teamSnap.exists()) {
    return { id: teamSnap.id, ...teamSnap.data() } as Team;
  }
  return null;
};

export const getAllTeams = async () => {
  const teamsRef = collection(db, 'teams');
  const querySnapshot = await getDocs(teamsRef);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Team[];
};

export const getTeamsByEvent = async (eventId: string) => {
  // Get all participations for this event that have teamId
  const participationsRef = collection(db, 'participations');
  const q = query(participationsRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);

  const teamIds = Array.from(
    new Set(
      querySnapshot.docs.map((doc) => doc.data().teamId).filter((teamId) => teamId !== undefined),
    ),
  );

  if (teamIds.length === 0) return [];

  // Fetch team details
  const teams: Team[] = [];
  for (const teamId of teamIds) {
    const team = await getTeam(teamId);
    if (team) {
      teams.push(team);
    }
  }

  return teams;
};

// Team invitation functions
export const createTeamInvitation = async (
  invitationData: Omit<TeamInvitation, 'id' | 'createdAt'>,
) => {
  const invitationRef = collection(db, 'teamInvitations');
  const docRef = await addDoc(invitationRef, {
    ...invitationData,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...invitationData };
};

export const getTeamInvitationByCode = async (code: string) => {
  const invitationsRef = collection(db, 'teamInvitations');
  const q = query(invitationsRef, where('code', '==', code), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as TeamInvitation;
  }
  return null;
};

export const getTeamInvitationsByTeam = async (teamId: string) => {
  const invitationsRef = collection(db, 'teamInvitations');
  const q = query(invitationsRef, where('teamId', '==', teamId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TeamInvitation[];
};

export const updateTeamInvitation = async (
  invitationId: string,
  updates: Partial<TeamInvitation>,
) => {
  const invitationRef = doc(db, 'teamInvitations', invitationId);
  await updateDoc(invitationRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const generateInvitationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const addTeamMember = async (
  teamId: string,
  userId: string,
  role: 'CAPTAIN' | 'MEMBER' = 'MEMBER',
) => {
  const teamMemberRef = collection(db, 'teamMembers');
  const docRef = await addDoc(teamMemberRef, {
    teamId,
    userId,
    role,
    joinedAt: serverTimestamp(),
  });
  return { id: docRef.id, teamId, userId, role };
};

export const getTeamMembers = async (teamId: string) => {
  const teamMembersRef = collection(db, 'teamMembers');
  const q = query(teamMembersRef, where('teamId', '==', teamId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TeamMember[];
};

export const getUserTeams = async (userId: string) => {
  const teamMembersRef = collection(db, 'teamMembers');
  const q = query(teamMembersRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  const teamIds = querySnapshot.docs.map((doc) => doc.data().teamId);
  const teams: Team[] = [];

  for (const teamId of teamIds) {
    const team = await getTeam(teamId);
    if (team) {
      teams.push(team);
    }
  }

  return teams;
};

export const checkIfNeedsReverification = async (
  userId: string,
  newBodyweight: number,
): Promise<boolean> => {
  const user = await getUser(userId);
  if (!user || user.role !== 'COMPETITOR') return false;

  // If user was previously verified and weight has changed significantly (>2kg), needs re-verification
  if (user.verificationStatus === 'VERIFIED' && user.bodyweight) {
    const weightDifference = Math.abs(newBodyweight - user.bodyweight);
    return weightDifference > 2; // More than 2kg change
  }

  return false;
};

export const updateUserWithReverificationCheck = async (
  userId: string,
  updates: Partial<User>,
): Promise<void> => {
  // Check if this is a weight update that might need re-verification
  if (updates.bodyweight && updates.bodyweight !== undefined) {
    const needsReverification = await checkIfNeedsReverification(userId, updates.bodyweight);
    if (needsReverification) {
      updates.verificationStatus = 'NEEDS_REVERIFICATION';
      updates.verificationNotes = `Weight changed from ${(await getUser(userId))?.bodyweight}kg to ${updates.bodyweight}kg. Re-verification required.`;
    }
  }

  await updateUser(userId, updates);
};

export const createCompetitionVerification = async (
  verificationData: Omit<CompetitionVerification, 'id' | 'verifiedAt'>,
) => {
  const verificationRef = collection(db, 'competitionVerifications');
  const docRef = await addDoc(verificationRef, {
    ...verificationData,
    verifiedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...verificationData };
};

export const getCompetitionVerification = async (userId: string, eventId: string) => {
  const verificationRef = collection(db, 'competitionVerifications');
  const q = query(
    verificationRef,
    where('userId', '==', userId),
    where('eventId', '==', eventId),
    limit(1),
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as CompetitionVerification;
  }
  return null;
};

export const updateCompetitionVerification = async (
  verificationId: string,
  updates: Partial<CompetitionVerification>,
) => {
  const verificationRef = doc(db, 'competitionVerifications', verificationId);
  await updateDoc(verificationRef, {
    ...updates,
    verifiedAt: serverTimestamp(),
  });
};

export const getCompetitionVerificationsByEvent = async (eventId: string) => {
  const verificationRef = collection(db, 'competitionVerifications');
  const q = query(verificationRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CompetitionVerification[];
};

export const checkCompetitionVerificationRequired = async (
  userId: string,
  eventId: string,
): Promise<boolean> => {
  const verification = await getCompetitionVerification(userId, eventId);
  return !verification || verification.status !== 'VERIFIED';
};
