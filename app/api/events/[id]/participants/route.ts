import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  isAdmin,
  getParticipationsByEvent,
  getUser,
} from '@/lib/firestore';
import { convertFirestoreTimestamp } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const event = await getEvent(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch regular participants for this event
    const participations = await getParticipationsByEvent(params.id);

    const regularParticipants = await Promise.all(
      participations.map(async (participation) => {
        const user = await getUser(participation.userId);

        // Skip guest users (they'll be added separately)
        if (user?.isGuest) {
          return null;
        }

        // Calculate age from date of birth
        let calculatedAge: number | undefined;
        if (user?.dateOfBirth) {
          const birthDate = convertFirestoreTimestamp(user.dateOfBirth);
          if (birthDate) {
            const today = new Date();
            calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
          }
        }

        return {
          id: participation.userId,
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com',
          bodyweight: user?.bodyweight,
          dateOfBirth: user?.dateOfBirth,
          sex: user?.sex,
          age: calculatedAge,
          joinedAt: participation.joinedAt,
          isGuest: false,
        };
      }),
    );

    // Fetch guest participants for this specific event
    const usersRef = collection(db, 'users');
    const guestQuery = query(
      usersRef,
      where('isGuest', '==', true),
      where('guestEventId', '==', params.id),
    );
    const guestSnapshot = await getDocs(guestQuery);

    const guestParticipants = await Promise.all(
      guestSnapshot.docs.map(async (docSnapshot) => {
        const userData = docSnapshot.data();

        // Calculate age from dateOfBirth
        let calculatedAge: number | undefined;
        if (userData.dateOfBirth) {
          const birthDate =
            userData.dateOfBirth instanceof Date
              ? userData.dateOfBirth
              : userData.dateOfBirth.toDate
                ? userData.dateOfBirth.toDate()
                : new Date(userData.dateOfBirth.seconds * 1000);
          const today = new Date();
          calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
        }

        return {
          id: docSnapshot.id,
          name: userData.name || 'Unknown',
          // Don't return email for guests (to avoid showing UID)
          email: undefined,
          bodyweight: userData.bodyweight,
          sex: userData.sex,
          age: calculatedAge,
          isGuest: true,
        };
      }),
    );

    // Combine regular and guest participants, filtering out nulls
    const allParticipants = [
      ...regularParticipants.filter((p) => p !== null),
      ...guestParticipants,
    ];

    return NextResponse.json({ participants: allParticipants });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
