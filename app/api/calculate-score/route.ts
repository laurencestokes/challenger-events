import { NextRequest, NextResponse } from 'next/server';
import { calculateScore } from '@/utils/scoreCalculation';
import { epleyFormula } from '@/utils/scoring';

export async function POST(request: NextRequest) {
  try {
    const { scoringSystemId, value, bodyweight, age, sex, reps } = await request.json();
    let valueForScoring = Number(value);
    // If reps > 1, apply Epley formula for strength exercises
    if (
      reps &&
      reps > 1 &&
      ['squat', 'bench', 'deadlift'].some((id) => scoringSystemId.includes(id))
    ) {
      valueForScoring = epleyFormula(Number(value), reps);
    }
    const result = await calculateScore(scoringSystemId, valueForScoring, bodyweight, age, sex);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to calculate score' }, { status: 400 });
  }
}
