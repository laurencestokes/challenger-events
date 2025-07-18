import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/lib/firestore';
import { addSSEClient, removeSSEClient } from '@/lib/sse-manager';

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    console.info('Public SSE: Received request for event:', params.eventId);

    const { eventId } = params;

    // Check if event exists
    const event = await getEvent(eventId);
    console.info('Public SSE: Event found in database:', !!event);

    if (!event) {
      console.log('Public SSE: Event not found in database for ID:', eventId);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.info('Public SSE: Setting up SSE connection for event:', eventId);

    // Set up SSE response
    const response = new Response(
      new ReadableStream({
        start(controller) {
          // Send initial connection message
          const initialMessage = `data: ${JSON.stringify({
            type: 'connected',
            eventId,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(initialMessage));

          // Add client to SSE manager
          const clientId = addSSEClient(eventId, controller);

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            console.info('Public SSE: Client disconnected for event:', eventId);
            removeSSEClient(eventId, clientId);
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
    console.error('Public SSE: Error setting up connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
