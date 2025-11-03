import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  createUser,
  getEvent,
  createParticipation,
  getUser,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const eventId = params.id;

    // Validate that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, age, sex, bodyweight } = body;

    if (!name || !age || !sex || bodyweight === undefined) {
      return NextResponse.json(
        { error: 'Name, age, sex, and bodyweight are required' },
        { status: 400 },
      );
    }

    if (!['M', 'F'].includes(sex)) {
      return NextResponse.json({ error: 'Sex must be M or F' }, { status: 400 });
    }

    if (bodyweight <= 0 || bodyweight > 500) {
      return NextResponse.json(
        { error: 'Bodyweight must be between 0 and 500 kg' },
        { status: 400 },
      );
    }

    // Generate unique uid for guest user
    const timestamp = Date.now();
    const guestUid = `guest-${eventId}-${timestamp}`;
    const guestEmail = `guest-${eventId}-${timestamp}@temp.local`;

    // Calculate dateOfBirth from age (approximate - use Jan 1st of birth year)
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    const dateOfBirth = new Date(birthYear, 0, 1);

    // Create guest user account
    const guestUser = await createUser({
      uid: guestUid,
      email: guestEmail,
      name: name,
      role: 'COMPETITOR',
      bodyweight: bodyweight,
      dateOfBirth: dateOfBirth,
      sex: sex as 'M' | 'F',
      verificationStatus: 'VERIFIED', // Auto-verified for guests
      isGuest: true,
      guestEventId: eventId,
    });

    // Create participation record
    await createParticipation({
      userId: guestUser.id,
      eventId: eventId,
    });

    // Auto-create competition verification for guest participants
    const { createCompetitionVerification } = await import('@/lib/firestore');
    await createCompetitionVerification({
      userId: guestUser.id,
      eventId: eventId,
      bodyweight: bodyweight,
      status: 'VERIFIED',
      verifiedBy: user.id, // Admin who created the guest
      verificationNotes: 'Auto-verified for guest participant',
    });

    return NextResponse.json({
      id: guestUser.id,
      name: guestUser.name,
      age: age,
      sex: guestUser.sex,
      bodyweight: guestUser.bodyweight,
      isGuest: true,
    });
  } catch (error) {
    console.error('Error creating guest participant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = _request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const eventId = params.id;

    // Validate that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Query guest participants for this specific event
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isGuest', '==', true), where('guestEventId', '==', eventId));
    const querySnapshot = await getDocs(q);

    const guestParticipants = await Promise.all(
      querySnapshot.docs.map(async (docSnapshot) => {
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
          age: calculatedAge,
          sex: userData.sex,
          bodyweight: userData.bodyweight,
          isGuest: true,
        };
      }),
    );

    return NextResponse.json({ participants: guestParticipants });
  } catch (error) {
    console.error('Error fetching guest participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const eventId = params.id;
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    // Validate that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get the guest user and verify they belong to this event
    const guestUser = await getUser(participantId);
    if (!guestUser || !guestUser.isGuest || guestUser.guestEventId !== eventId) {
      return NextResponse.json(
        { error: 'Guest participant not found or does not belong to this event' },
        { status: 404 },
      );
    }

    // Delete participation records for this guest and event
    const participationsRef = collection(db, 'participations');
    const participationQuery = query(
      participationsRef,
      where('userId', '==', participantId),
      where('eventId', '==', eventId),
    );
    const participationSnapshot = await getDocs(participationQuery);
    await Promise.all(participationSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    // Delete the guest user
    const userRef = doc(db, 'users', participantId);
    await deleteDoc(userRef);

    return NextResponse.json({ message: 'Guest participant deleted successfully' });
  } catch (error) {
    console.error('Error deleting guest participant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
