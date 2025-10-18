import { NextRequest, NextResponse } from 'next/server';
import { getUser, getEvent } from '@/lib/firestore';
import { addSSEClient, removeSSEClient } from '@/lib/sse-manager';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.info('SSE: Received request for event:', params.id);

    // Get token from query parameter (EventSource doesn't support custom headers)
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    console.log('SSE: Token present:', !!token);

    if (!token) {
      console.log('SSE: Missing token parameter');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = token;
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
            try {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              );
            } catch (error) {
              console.error('SSE: Error sending heartbeat:', error);
              clearInterval(heartbeat);
              removeSSEClient(params.id, controller);
            }
          }, 30000); // Every 30 seconds

          // Set a maximum connection time (5 minutes)
          const connectionTimeout = setTimeout(
            () => {
              console.info('SSE: Connection timeout reached, closing connection');
              clearInterval(heartbeat);
              removeSSEClient(params.id, controller);
              try {
                controller.close();
              } catch (error) {
                console.error('SSE: Error closing controller:', error);
              }
            },
            5 * 60 * 1000,
          ); // 5 minutes

          // Clean up on close
          request.signal.addEventListener('abort', () => {
            console.info('SSE: Client disconnected');
            clearInterval(heartbeat);
            clearTimeout(connectionTimeout);
            removeSSEClient(params.id, controller);
            try {
              controller.close();
            } catch (error) {
              console.error('SSE: Error closing controller on abort:', error);
            }
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
