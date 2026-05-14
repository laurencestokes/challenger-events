import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lib/firebase';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import {
  deleteCompetitionVerificationForUserEvent,
  deleteParticipationsForUserEvent,
  deleteScoresForUserEvent,
  getEvent,
  getUser,
  getUserByUid,
  isAdmin,
} from '@lib/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id: eventId, userId: targetUserId } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUid = authHeader.split('Bearer ')[1];
    const adminUser = await getUserByUid(adminUid);

    if (!adminUser || !isAdmin(adminUser.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const targetUser = await getUser(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Guest path: delete the synthetic user doc and all their participation rows (matches
    // the legacy guest-delete behaviour). Scores stay orphaned, as they did before.
    if (targetUser.isGuest && targetUser.guestEventId === eventId) {
      const participationsRef = collection(db, 'participations');
      const participationsSnapshot = await getDocs(
        query(participationsRef, where('userId', '==', targetUserId)),
      );
      await Promise.all(participationsSnapshot.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'users', targetUserId));

      return NextResponse.json({
        message: 'Guest participant removed',
        removed: {
          isGuest: true,
          participations: participationsSnapshot.size,
        },
      });
    }

    // Registered-user path: scope every delete to this event. Leave the user doc alone.
    const removedParticipations = await deleteParticipationsForUserEvent(targetUserId, eventId);
    if (removedParticipations === 0) {
      return NextResponse.json(
        { error: 'User is not a participant in this event' },
        { status: 400 },
      );
    }
    const removedScores = await deleteScoresForUserEvent(targetUserId, eventId);
    const removedVerifications = await deleteCompetitionVerificationForUserEvent(
      targetUserId,
      eventId,
    );

    return NextResponse.json({
      message: 'Participant removed from event',
      removed: {
        isGuest: false,
        participations: removedParticipations,
        scores: removedScores,
        competitionVerifications: removedVerifications,
      },
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
