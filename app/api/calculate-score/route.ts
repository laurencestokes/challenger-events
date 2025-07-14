import { NextResponse } from 'next/server';
import { calculateScore } from '@/utils/scoreCalculation';

export async function POST(request: Request) {
  const data = await request.json();
  const { scoringSystemId, value, bodyweight, dateOfBirth, sex } = data;

  if (!scoringSystemId || value === undefined) {
    return NextResponse.json(
      { error: 'Scoring system ID and value are required' },
      { status: 400 },
    );
  }

  try {
    const result = await calculateScore(scoringSystemId, value, bodyweight, dateOfBirth, sex);

    const response = {
      score: result.score,
      percentile: result.percentile,
      scoringSystem: result.scoringSystem,
    };

    console.log('Calculate-score response:', {
      scoringSystemId,
      value,
      result: response,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating score:', error);
    console.error('Error details:', {
      scoringSystemId,
      value,
      bodyweight,
      dateOfBirth,
      sex,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Failed to calculate score',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
