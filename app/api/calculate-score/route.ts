import { NextResponse } from 'next/server';
import { getScoringSystemById } from '@/constants/scoringSystems';
import {
  calculateSquatScoreNew,
  calculateBenchScoreNew,
  calculateDeadliftScoreNew,
  calculateRowingScoreNew,
  convertSex,
} from '@/utils/scoring';

function timeToSeconds(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

function timeToWatts(timeStr: string): number {
  const timeSeconds = timeToSeconds(timeStr);
  // Note: This would need to be implemented based on your ChallengerData package
  // For now, using a simple conversion
  return 500 / timeSeconds; // Simple watts approximation
}

export async function POST(request: Request) {
  const data = await request.json();
  const { scoringSystemId, value, bodyweight, age, sex } = data;

  if (!scoringSystemId || value === undefined) {
    return NextResponse.json(
      { error: 'Scoring system ID and value are required' },
      { status: 400 },
    );
  }

  const scoringSystem = getScoringSystemById(scoringSystemId);
  if (!scoringSystem) {
    return NextResponse.json({ error: 'Scoring system not found' }, { status: 404 });
  }

  try {
    let result;

    // Convert sex format if needed
    const sexConverted = convertSex(sex as 'M' | 'F');

    switch (scoringSystem.calculationFunction) {
      case 'squatScore':
        result = calculateSquatScoreNew(value, sexConverted, age, bodyweight);
        break;
      case 'benchScore':
        result = calculateBenchScoreNew(value, sexConverted, age, bodyweight);
        break;
      case 'deadliftScore':
        result = calculateDeadliftScoreNew(value, sexConverted, age, bodyweight);
        break;
      case 'rowingScore':
        // For rowing, convert time to watts first
        const rowingWatts = timeToWatts(value);
        result = calculateRowingScoreNew(rowingWatts, sexConverted, age, bodyweight);
        break;
      case 'customWeight':
        // Simple weight-based scoring (no age/sex adjustments)
        result = { score: value, percentile: 50 };
        break;
      case 'customTime':
        // Time-based scoring (faster is better)
        const timeSeconds = timeToSeconds(value);
        result = { score: 1000 / timeSeconds, percentile: 50 }; // Simple inverse scoring
        break;
      case 'customReps':
        // Rep-based scoring (more reps is better)
        result = { score: value, percentile: 50 };
        break;
      case 'customDistance':
        // Distance-based scoring (longer distance is better)
        result = { score: value, percentile: 50 };
        break;
      case 'rowingDistance':
        // For rowing distance, we can use a simple scoring based on distance
        // This could be enhanced with more sophisticated calculations
        result = { score: value, percentile: 50 };
        break;
      case 'rowingScoreDistance':
        // For distance-based rowing, convert distance to equivalent time
        // Assuming a 2-minute time period, calculate equivalent 500m pace
        const distanceInMeters = value;
        const timeInSeconds = 120; // 2 minutes
        const pacePer500m = (timeInSeconds / distanceInMeters) * 500;
        const distanceWatts = timeToWatts(pacePer500m.toString());
        result = calculateRowingScoreNew(distanceWatts, sexConverted, age, bodyweight);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported scoring system' }, { status: 400 });
    }

    return NextResponse.json({
      score: result.score,
      percentile: result.percentile,
      scoringSystem: {
        id: scoringSystem.id,
        name: scoringSystem.name,
        category: scoringSystem.category,
      },
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 });
  }
}
