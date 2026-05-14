import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getUserByEmail,
  isAdmin,
  createUser,
  getEvent,
  createParticipation,
  getUser,
  getUserParticipation,
} from '@lib/firestore';
import { db } from '@lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendGuestWelcome, subscribeContact } from '@lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculateAgeFromDob(dob: unknown): number | undefined {
  if (!dob) return undefined;
  let birthDate: Date;
  if (dob instanceof Date) {
    birthDate = dob;
  } else if (typeof dob === 'object' && dob !== null) {
    const obj = dob as { toDate?: () => Date; seconds?: number };
    if (typeof obj.toDate === 'function') {
      birthDate = obj.toDate();
    } else if (typeof obj.seconds === 'number') {
      birthDate = new Date(obj.seconds * 1000);
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const eventId = id;

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const mode: 'existing' | 'guest' = body?.mode === 'existing' ? 'existing' : 'guest';

    if (mode === 'existing') {
      const { userId: targetUserId } = body;
      if (!targetUserId || typeof targetUserId !== 'string') {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const targetUser = await getUser(targetUserId);
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (targetUser.isGuest) {
        return NextResponse.json({ error: 'Use the guest flow for guest users' }, { status: 400 });
      }

      const existingParticipation = await getUserParticipation(targetUserId, eventId);
      if (existingParticipation) {
        return NextResponse.json(
          {
            error: `${targetUser.name} is already a participant in this event`,
            error_code: 'ALREADY_PARTICIPATING',
          },
          { status: 409 },
        );
      }

      await createParticipation({
        userId: targetUserId,
        eventId,
      });

      return NextResponse.json({
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        sex: targetUser.sex,
        bodyweight: targetUser.bodyweight,
        age: calculateAgeFromDob(targetUser.dateOfBirth),
        isGuest: false,
      });
    }

    // mode === 'guest'
    const { name, age, sex, bodyweight, email: rawEmail } = body;

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

    const providedEmail =
      typeof rawEmail === 'string' && rawEmail.trim().length > 0
        ? rawEmail.trim().toLowerCase()
        : null;

    if (providedEmail && !EMAIL_REGEX.test(providedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (providedEmail) {
      const existing = await getUserByEmail(providedEmail);
      if (existing && !existing.isGuest) {
        return NextResponse.json(
          {
            error: `An account already exists for ${existing.name}.`,
            error_code: 'EMAIL_BELONGS_TO_REGISTERED_USER',
            existingUserId: existing.id,
            existingUserName: existing.name,
            existingUserEmail: existing.email,
          },
          { status: 409 },
        );
      }
    }

    const timestamp = Date.now();
    const guestUid = `guest-${eventId}-${timestamp}`;
    const guestEmail = providedEmail ?? `guest-${eventId}-${timestamp}@temp.local`;

    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    const dateOfBirth = new Date(birthYear, 0, 1);

    const guestUser = await createUser({
      uid: guestUid,
      email: guestEmail,
      name: name,
      role: 'COMPETITOR',
      bodyweight: bodyweight,
      dateOfBirth: dateOfBirth,
      sex: sex as 'M' | 'F',
      verificationStatus: 'VERIFIED',
      isGuest: true,
      guestEventId: eventId,
    });

    await createParticipation({
      userId: guestUser.id,
      eventId: eventId,
    });

    const { createCompetitionVerification } = await import('@lib/firestore');
    await createCompetitionVerification({
      userId: guestUser.id,
      eventId: eventId,
      bodyweight: bodyweight,
      status: 'VERIFIED',
      verifiedBy: user.id,
      verificationNotes: 'Auto-verified for guest participant',
    });

    if (providedEmail) {
      try {
        await sendGuestWelcome(providedEmail, name, event.name);
      } catch (emailError) {
        console.error('Error sending guest welcome email:', emailError);
      }
      await subscribeContact(providedEmail, name);
    }

    return NextResponse.json({
      id: guestUser.id,
      name: guestUser.name,
      email: providedEmail ?? undefined,
      age: age,
      sex: guestUser.sex,
      bodyweight: guestUser.bodyweight,
      isGuest: true,
    });
  } catch (error) {
    console.error('Error creating participant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = _request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const eventId = id;

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isGuest', '==', true), where('guestEventId', '==', eventId));
    const querySnapshot = await getDocs(q);

    const guestParticipants = querySnapshot.docs.map((docSnapshot) => {
      const userData = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: userData.name || 'Unknown',
        age: calculateAgeFromDob(userData.dateOfBirth),
        sex: userData.sex,
        bodyweight: userData.bodyweight,
        isGuest: true,
      };
    });

    return NextResponse.json({ participants: guestParticipants });
  } catch (error) {
    console.error('Error fetching guest participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
