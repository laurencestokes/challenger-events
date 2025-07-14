import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getEvent } from '@/lib/firestore';

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

    // Check if event exists
    const event = await getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Set up SSE headers
    const response = new Response(
      new ReadableStream({
        start(controller) {
          // Send initial connection message
          controller.enqueue(
            `data: ${JSON.stringify({ type: 'connected', eventId: params.id })}\n\n`,
          );

          // Keep connection alive with periodic heartbeats
          const heartbeat = setInterval(() => {
            controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
          }, 30000); // Every 30 seconds

          // Clean up on close
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeat);
            controller.close();
          });
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
        },
      },
    );

    return response;
  } catch (error) {
    console.error('Error in workout reveals SSE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
