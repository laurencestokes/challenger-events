import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, updateUser } from '@lib/firestore';
import { db } from '@lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { User } from '@lib/firestore';
import { subscribeContact } from '@lib/email';

const USERID_COLLECTIONS = ['scores', 'participations', 'teamMembers', 'competitionVerifications'];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = authHeader.split('Bearer ')[1];
    const newUser = await getUserByUid(uid);

    if (!newUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (newUser.isGuest) {
      return NextResponse.json({ error: 'Guest users cannot run merge' }, { status: 403 });
    }

    if (!newUser.email) {
      return NextResponse.json({ mergedGuests: 0, summary: [] });
    }

    // Subscribe the newly-registered user as a Resend contact for broadcast emails.
    // Runs on every signup (merge-guest-data is the post-signup hook). Helper swallows its own errors.
    await subscribeContact(newUser.email, newUser.name);

    const usersRef = collection(db, 'users');
    const guestQuery = query(
      usersRef,
      where('email', '==', newUser.email.toLowerCase()),
      where('isGuest', '==', true),
    );
    const guestSnapshot = await getDocs(guestQuery);

    if (guestSnapshot.empty) {
      return NextResponse.json({ mergedGuests: 0, summary: [] });
    }

    const summary: Array<{ guestId: string; eventId?: string; recordsRewritten: number }> = [];
    const backfill: { bodyweight?: number; dateOfBirth?: unknown; sex?: 'M' | 'F' } = {};

    for (const guestDoc of guestSnapshot.docs) {
      const guestId = guestDoc.id;
      const guestData = guestDoc.data();
      const batch = writeBatch(db);
      let recordsRewritten = 0;

      for (const collectionName of USERID_COLLECTIONS) {
        const refsQuery = query(collection(db, collectionName), where('userId', '==', guestId));
        const refsSnapshot = await getDocs(refsQuery);
        refsSnapshot.docs.forEach((docSnap) => {
          batch.update(docSnap.ref, { userId: newUser.id });
          recordsRewritten += 1;
        });
      }

      // Capture profile fields from the first guest doc that has them, for backfill below
      if (backfill.bodyweight === undefined && typeof guestData.bodyweight === 'number') {
        backfill.bodyweight = guestData.bodyweight;
      }
      if (backfill.dateOfBirth === undefined && guestData.dateOfBirth) {
        backfill.dateOfBirth = guestData.dateOfBirth;
      }
      if (backfill.sex === undefined && (guestData.sex === 'M' || guestData.sex === 'F')) {
        backfill.sex = guestData.sex;
      }

      // Delete the guest user doc as part of the same batch
      batch.delete(doc(db, 'users', guestId));

      await batch.commit();

      summary.push({
        guestId,
        eventId: typeof guestData.guestEventId === 'string' ? guestData.guestEventId : undefined,
        recordsRewritten,
      });
    }

    // Backfill profile fields on the new user doc only where they're currently missing
    const userUpdate: Partial<User> = {};
    if (backfill.bodyweight !== undefined && newUser.bodyweight === undefined) {
      userUpdate.bodyweight = backfill.bodyweight;
    }
    if (backfill.dateOfBirth !== undefined && newUser.dateOfBirth === undefined) {
      userUpdate.dateOfBirth = backfill.dateOfBirth as Date;
    }
    if (backfill.sex !== undefined && newUser.sex === undefined) {
      userUpdate.sex = backfill.sex;
    }
    if (Object.keys(userUpdate).length > 0) {
      await updateUser(newUser.id, userUpdate);
    }

    return NextResponse.json({
      mergedGuests: summary.length,
      summary,
    });
  } catch (error) {
    console.error('Error merging guest data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
