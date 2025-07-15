import { NextRequest, NextResponse } from 'next/server';
import { getUser, getEvent } from '@/lib/firestore';
import { addSSEClient, removeSSEClient } from '@/lib/sse-manager';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.info('SSE: Received request for event:', params.id);

    const authHeader = request.headers.get('authorization');
    console.log('SSE: Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('SSE: Missing or invalid auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    console.log('SSE: User ID from token:', userId);

    const user = await getUser(userId);
    console.info('SSE: User found in database:', !!user);

    if (!user) {
      console.log('SSE: User not found in database for ID:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if event exists
    const event = await getEvent(params.id);
    console.info('SSE: Event found in database:', !!event);

    if (!event) {
      console.log('SSE: Event not found in database for ID:', params.id);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.info('SSE: Setting up SSE connection for event:', params.id);

    // Set up SSE headers
    const response = new Response(
      new ReadableStream({
        start(controller) {
          // Add this client to the connected clients
          addSSEClient(params.id, controller);

          // Send initial connection message
          controller.enqueue(
            `data: ${JSON.stringify({
              type: 'connected',
              eventId: params.id,
              message: 'Connected to workout reveals',
            })}\n\n`,
          );

          // Keep connection alive with periodic heartbeats
          const heartbeat = setInterval(() => {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
              })}\n\n`,
            );
          }, 30000); // Every 30 seconds

          // Clean up on close
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeat);
            removeSSEClient(params.id, controller);
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
