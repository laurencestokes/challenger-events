import { NextResponse } from 'next/server';
import { EVENT_TYPES } from '@/constants/eventTypes';

// Filter to only erg-related events for team competitions
const ergEventTypes = EVENT_TYPES.filter(
  (eventType) =>
    eventType.id.includes('rowing') ||
    eventType.id.includes('bike') ||
    eventType.id.includes('ski'),
).map((eventType) => ({
  id: eventType.id,
  name: eventType.name,
  description: eventType.description,
  category: eventType.category,
  inputType: eventType.inputType,
  unit: eventType.unit,
  ergType: eventType.id.includes('rowing')
    ? 'rowing'
    : eventType.id.includes('bike')
      ? 'bike'
      : eventType.id.includes('ski')
        ? 'ski'
        : 'universal',
}));

export async function GET() {
  try {
    return NextResponse.json({ eventTypes: ergEventTypes });
  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
