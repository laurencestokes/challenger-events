import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, isAdmin, updateEvent, getEvent } from '@/lib/firestore';

// Simple endpoint to handle image URL updates after client-side upload
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.replace('Bearer ', '');
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const eventId = params.id;
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    // Check if event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is admin
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: 'Not authorized to update this event' }, { status: 403 });
    }

    // Update event document with image URL
    await updateEvent(eventId, { imageUrl });

    return NextResponse.json({
      message: 'Image updated successfully',
      imageUrl,
    });
  } catch (error) {
    console.error('Error updating event image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
