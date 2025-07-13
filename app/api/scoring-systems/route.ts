export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  SCORING_SYSTEMS,
  getScoringSystemsByCategory,
  getScoringSystemsByInputType,
} from '@/constants/scoringSystems';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const inputType = searchParams.get('inputType');

    let systems = SCORING_SYSTEMS;

    if (category) {
      systems = getScoringSystemsByCategory(category as 'STRENGTH' | 'ENDURANCE' | 'MIXED');
    }

    if (inputType) {
      systems = getScoringSystemsByInputType(
        inputType as 'WEIGHT' | 'TIME' | 'DISTANCE' | 'REPS' | 'CUSTOM',
      );
    }

    return NextResponse.json(systems);
  } catch (error) {
    console.error('Error fetching scoring systems:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
