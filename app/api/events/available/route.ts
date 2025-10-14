import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getEventsByParticipant } from '@/lib/firestore';

// GET: Fetch all available events that users can join
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

    // Get all events that are ACTIVE (available to join)
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const db = (await import('@/lib/firebase')).db;
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('status', '==', 'ACTIVE'));
    const querySnapshot = await getDocs(q);
    const allEvents = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as {
      id: string;
      scope: string;
      endDate: string | unknown;
      startDate: string | unknown;
    }[];

    // Filter events based on scoping rules
    const scopedEvents = allEvents.filter((event) => {
      // For now, we'll implement a simple public events system
      // Later we can extend this to support organization/gym scoping

      // Check if event is public (no scoping restrictions)
      if (!event.scope || event.scope === 'PUBLIC') {
        return true;
      }

      // TODO: Add organization/gym scoping logic here
      // if (event.scope === 'ORGANIZATION') {
      //   return user.organizationId === event.organizationId;
      // }
      // if (event.scope === 'GYM') {
      //   return user.gymId === event.gymId;
      // }

      // For now, only show public events
      return false;
    });

    // Get events the user is already participating in
    const userParticipatingEvents = await getEventsByParticipant(user.id);
    const participatingEventIds = new Set(userParticipatingEvents.map((event) => event.id));

    // Filter out events the user is already participating in
    const availableEvents = scopedEvents.filter((event) => !participatingEventIds.has(event.id));

    // Filter out past events (events that have ended)
    const upcomingEvents = availableEvents.filter((event) => {
      if (!event.endDate) {
        // If no end date, consider it upcoming
        return true;
      }

      // Parse end date (handle Firestore Timestamp objects)
      let endDate: Date;
      if (typeof event.endDate === 'object' && event.endDate !== null) {
        if ('seconds' in event.endDate && typeof event.endDate.seconds === 'number') {
          endDate = new Date(event.endDate.seconds * 1000);
        } else if ('toDate' in event.endDate && typeof event.endDate.toDate === 'function') {
          endDate = event.endDate.toDate();
        } else {
          return true; // If we can't parse the date, include it
        }
      } else if (typeof event.endDate === 'string') {
        endDate = new Date(event.endDate);
      } else if (event.endDate instanceof Date) {
        endDate = event.endDate;
      } else if (typeof event.endDate === 'number') {
        endDate = new Date(event.endDate);
      } else {
        return true; // If we can't parse the date, include it
      }

      // Check if event has ended (end date is in the past)
      return endDate > new Date();
    });

    // Sort by startDate (upcoming events first)
    const sortedEvents = upcomingEvents.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate as Date).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate as Date).getTime() : 0;
      return dateA - dateB; // Earliest first
    });

    return NextResponse.json(sortedEvents);
  } catch (error) {
    console.error('Error fetching available events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
