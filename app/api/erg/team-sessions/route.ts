import { NextRequest, NextResponse } from 'next/server';
import { TeamErgSession, Competitor } from '@/hooks/useErgSocket';

// Team session management API
// Creates and manages team-based erg sessions

// TypeScript global augmentation for session storage
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-var
  var teamErgSessions: Map<string, any> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-var
  var io: any;
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    const body = await request.json();
    const { teamA, teamB, eventId, eventType, sessionType } = body;

    if (!teamA || !teamB) {
      return NextResponse.json({ error: 'Both teams are required' }, { status: 400 });
    }

    // For custom teams (temporary teams), we allow empty member lists
    // For existing teams, we require at least one member
    const isCustomTeam = teamA.id.startsWith('temp_team_') || teamB.id.startsWith('temp_team_');

    if (
      !isCustomTeam &&
      (!teamA.members || !teamB.members || teamA.members.length === 0 || teamB.members.length === 0)
    ) {
      return NextResponse.json(
        { error: 'Both teams must have at least one member' },
        { status: 400 },
      );
    }

    // Generate unique session ID
    const sessionId = `team_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store session data (in production, save to database)
    const sessionData: TeamErgSession = {
      id: sessionId,
      teamA,
      teamB,
      eventId,
      eventType,
      sessionType: sessionType || 'team',
    };

    // Store in global session map for Socket.IO server
    if (!globalThis.teamErgSessions) {
      globalThis.teamErgSessions = new Map();
    }
    globalThis.teamErgSessions.set(sessionId, {
      ...sessionData,
      createdAt: new Date().toISOString(),
      status: 'active',
      teamScores: {
        [teamA.id]: {
          teamId: teamA.id,
          teamName: teamA.name,
          totalScore: 0,
          participantScores: teamA.members.map((member: Competitor) => ({
            participantId: member.id,
            participantName: member.name,
            score: 0,
            isActive: false,
          })),
        },
        [teamB.id]: {
          teamId: teamB.id,
          teamName: teamB.name,
          totalScore: 0,
          participantScores: teamB.members.map((member: Competitor) => ({
            participantId: member.id,
            participantName: member.name,
            score: 0,
            isActive: false,
          })),
        },
      },
    });

    console.log('Team session created and stored:', sessionId);

    return NextResponse.json({
      success: true,
      session: sessionData,
    });
  } catch (error) {
    console.error('Error creating team session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session from global storage
    if (!globalThis.teamErgSessions) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = globalThis.teamErgSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error fetching team session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
