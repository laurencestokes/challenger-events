import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  getUserParticipation,
  getUserTeams,
  getTeamMembers,
} from '@/lib/firestore';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const eventId = params.id;
    const event = await getEvent(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get user's participation record for this event
    const participation = await getUserParticipation(user.id, eventId);

    // Get user's teams
    const userTeams = await getUserTeams(user.id);

    // Get team members for each team
    const teamsWithMembers = await Promise.all(
      userTeams.map(async (team) => {
        const members = await getTeamMembers(team.id);
        return {
          ...team,
          members: members.map((m) => ({ userId: m.userId, role: m.role })),
        };
      }),
    );

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      event: {
        id: event.id,
        name: event.name,
        isTeamEvent: event.isTeamEvent,
      },
      participation: participation
        ? {
            id: participation.id,
            userId: participation.userId,
            eventId: participation.eventId,
            teamId: participation.teamId,
            joinedAt: participation.joinedAt,
          }
        : null,
      userTeams: teamsWithMembers,
    });
  } catch (error) {
    console.error('Error debugging participation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
