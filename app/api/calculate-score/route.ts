import { NextRequest, NextResponse } from 'next/server';
import { calculateScore } from '@/utils/scoreCalculation';

export async function POST(request: NextRequest) {
  try {
    const { scoringSystemId, value, bodyweight, dateOfBirth, sex, reps } = await request.json();
    const result = await calculateScore(
      scoringSystemId,
      Number(value),
      bodyweight,
      dateOfBirth,
      sex,
      reps,
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to calculate score' }, { status: 400 });
  }
}
