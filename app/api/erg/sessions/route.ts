import { NextRequest, NextResponse } from 'next/server';

// Session management API
// Creates and manages head-to-head erg sessions

// TypeScript global augmentation for session storage
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-var
  var ergSessions: Map<string, any> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-var
  var io: any;
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    const body = await request.json();
    const { competitor1, competitor2, eventId, eventType } = body;

    if (!competitor1 || !competitor2) {
      return NextResponse.json({ error: 'Both competitors are required' }, { status: 400 });
    }

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store session data (in production, save to database)
    const sessionData = {
      id: sessionId,
      competitor1,
      competitor2,
      eventId,
      eventType,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    // Store in global session map for Socket.IO server
    if (!globalThis.ergSessions) {
      globalThis.ergSessions = new Map();
    }
    globalThis.ergSessions.set(sessionId, sessionData);

    console.log(
      'Session created and stored:',
      sessionId,
      'with eventId:',
      eventId,
      'eventType:',
      eventType,
    );

    return NextResponse.json({
      success: true,
      session: sessionData,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // In production, fetch from database
    // For now, return from in-memory store if available
    const session = globalThis.ergSessions?.get(sessionId);

    if (!session) {
      console.error('Session not found in global map:', sessionId);
      console.log(
        'Available sessions:',
        globalThis.ergSessions ? Array.from(globalThis.ergSessions.keys()) : 'No sessions map',
      );
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('Session found:', sessionId);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    const body = await request.json();
    const { sessionId, competitor1, competitor2 } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!competitor1 || !competitor2) {
      return NextResponse.json({ error: 'Both competitors are required' }, { status: 400 });
    }

    // Get existing session
    if (!globalThis.ergSessions) {
      globalThis.ergSessions = new Map();
    }

    const existingSession = globalThis.ergSessions.get(sessionId);
    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session data
    const updatedSession = {
      ...existingSession,
      competitor1,
      competitor2,
      updatedAt: new Date().toISOString(),
    };

    globalThis.ergSessions.set(sessionId, updatedSession);

    // Emit socket event to notify Python client and viewers
    if (globalThis.io) {
      // Notify Python client to update competitors
      globalThis.io.to('python-client').emit('session:competitors-updated', {
        sessionId,
        competitor1,
        competitor2,
      });

      // Broadcast to all viewers
      globalThis.io.to(`session:${sessionId}`).emit('session:competitors-updated', {
        sessionId,
        competitor1,
        competitor2,
      });
    }

    console.log('Session competitors updated:', sessionId);

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
