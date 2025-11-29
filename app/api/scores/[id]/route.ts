import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, isAdmin, deleteScore, getUser } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { broadcastToEvent } from '@/lib/sse-manager';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is admin
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const scoreId = params.id;

    // Verify the score exists and get its details
    const scoreRef = doc(db, 'scores', scoreId);
    const scoreSnap = await getDoc(scoreRef);

    if (!scoreSnap.exists()) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 });
    }

    const scoreData = scoreSnap.data();

    // Verify that the score belongs to an event (not a personal score)
    if (!scoreData.eventId) {
      return NextResponse.json(
        { error: 'Cannot delete personal scores through this endpoint' },
        { status: 400 },
      );
    }

    // Extract eventId before deletion for broadcasting
    const eventId = scoreData.eventId as string;

    // Get the user who owns this score for revalidation
    const scoreOwner = await getUser(scoreData.userId);
    if (!scoreOwner) {
      return NextResponse.json({ error: 'Score owner not found' }, { status: 404 });
    }

    // Delete the score
    await deleteScore(scoreId);

    // Trigger on-demand revalidation for the competitor's public profile page
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/revalidate/profile/${scoreOwner.uid}`, {
        method: 'POST',
        headers: {
          'x-revalidate-secret': process.env.REVALIDATE_SECRET || '',
        },
      });
    } catch (err) {
      console.error('Failed to revalidate public profile page:', err);
    }

    // Broadcast score submission event to update public leaderboard
    try {
      const broadcastMessage = JSON.stringify({
        type: 'score_submitted',
        eventId: eventId,
        timestamp: new Date().toISOString(),
      });
      broadcastToEvent(eventId, broadcastMessage);
    } catch (err) {
      console.error('Failed to broadcast score deletion event:', err);
    }

    return NextResponse.json({ message: 'Score deleted successfully' });
  } catch (error) {
    console.error('Error deleting score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
