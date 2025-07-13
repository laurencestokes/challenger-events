import { NextResponse } from 'next/server';
import { getScoringSystemById } from '@/constants/scoringSystems';
import {
  calculateSquatScoreNew,
  calculateBenchScoreNew,
  calculateDeadliftScoreNew,
  convertSex,
  paceToWatts,
} from '@/utils/scoring';
import { ChallengerData } from '@challengerco/challenger-data';

const challengerData = new ChallengerData();
import { convertFirestoreTimestamp } from '@/lib/utils';

function timeToSeconds(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

export async function POST(request: Request) {
  const data = await request.json();
  const { scoringSystemId, value, bodyweight, dateOfBirth, sex } = data;

  if (!scoringSystemId || value === undefined) {
    return NextResponse.json(
      { error: 'Scoring system ID and value are required' },
      { status: 400 },
    );
  }

  // Calculate age from date of birth
  let age = 25; // Default age
  if (dateOfBirth) {
    const birthDate = convertFirestoreTimestamp(dateOfBirth);
    if (birthDate) {
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
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
        // For 500m row, value is in seconds; for others, value may be mm:ss
        let pace;
        if (scoringSystemId === 'rowing_500m') {
          // Value is already in seconds - this is the pace per 500m
          pace = Number(value);
        } else {
          // Value is mm:ss string - for 2km row, convert to pace per 500m
          const totalTimeSeconds = timeToSeconds(value);
          pace = totalTimeSeconds / 4; // 2km = 4 x 500m
        }
        // Convert pace to watts, then calculate rowing score
        const watts = paceToWatts(pace);
        result = challengerData.rowingScore(watts, sexConverted, age, bodyweight);
        break;
      case 'rowingScoreSeconds':
        // For 500m row, value is already in seconds - this is the pace per 500m
        const paceSeconds = Number(value);
        const wattsFromSeconds = paceToWatts(paceSeconds);
        result = challengerData.rowingScore(wattsFromSeconds, sexConverted, age, bodyweight);
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
        const distanceWatts = paceToWatts(pacePer500m);
        result = challengerData.rowingScore(distanceWatts, sexConverted, age, bodyweight);
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
    console.error('Error details:', {
      scoringSystemId,
      value,
      bodyweight,
      age,
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
