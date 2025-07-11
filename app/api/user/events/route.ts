import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getEventsByParticipant, getScoresByUserAndEvent } from '@/lib/firestore';

export async function GET(request: NextRequest) {
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

    // Get events the user has participated in
    const userEvents = await getEventsByParticipant(user.id);

    // For each event, get the user's scores and participation details
    const eventsWithDetails = await Promise.all(
      userEvents.map(async (event) => {
        const scores = await getScoresByUserAndEvent(user.id, event.id);

        // Calculate total score
        const totalScore =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + (score.calculatedScore || 0), 0)
            : undefined;

        // Get participation details (we'll need to fetch this separately)
        // For now, we'll use the event creation date as joined date
        // TODO: Implement proper participation tracking

        return {
          id: event.id,
          name: event.name,
          code: event.code,
          status: event.status,
          joinedAt: event.createdAt, // This should be the actual join date
          score: totalScore,
        };
      }),
    );

    return NextResponse.json(eventsWithDetails);
  } catch (error) {
    console.error('Error fetching user events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
