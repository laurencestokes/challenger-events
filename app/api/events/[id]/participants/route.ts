import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  isAdmin,
  getParticipationsByEvent,
  getUser,
} from '@/lib/firestore';
import { convertFirestoreTimestamp } from '@/lib/utils';

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

    // Fetch participants for this event
    const participations = await getParticipationsByEvent(params.id);

    const participants = await Promise.all(
      participations.map(async (participation) => {
        const user = await getUser(participation.userId);

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
        };
      }),
    );

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
