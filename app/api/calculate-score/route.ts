import { NextResponse } from 'next/server';
import { getScoringSystemById } from '@/constants/scoringSystems';
import {
  calculateSquatScoreNew,
  calculateBenchScoreNew,
  calculateDeadliftScoreNew,
  convertSex,
  paceToWatts,
  epleyFormula,
} from '@/utils/scoring';
import { ChallengerData } from '@challengerco/challenger-data';

const challengerData = new ChallengerData();
import { convertFirestoreTimestamp } from '@/lib/utils';

function timeToSeconds(timeStr: string): number {
  // Handle mm:ss.ms format (e.g., "1:26.3" -> 86.3 seconds)
  if (timeStr.includes(':')) {
    const [minutes, secondsPart] = timeStr.split(':');
    const minutesNum = Number(minutes);

    // Handle seconds with potential milliseconds
    if (secondsPart.includes('.')) {
      const [seconds, milliseconds] = secondsPart.split('.');
      const secondsNum = Number(seconds);
      const millisecondsNum = Number(milliseconds);
      return minutesNum * 60 + secondsNum + millisecondsNum / 10; // Assuming 1 decimal place
    } else {
      const secondsNum = Number(secondsPart);
      return minutesNum * 60 + secondsNum;
    }
  }
  // Handle seconds only (e.g., "86.3" -> 86.3 seconds)
  return Number(timeStr);
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
      case 'squatScoreReps':
        // Convert rep-based weight to 1RM using Epley formula
        const { weight, reps } = data;
        const oneRM = epleyFormula(weight, reps);
        result = calculateSquatScoreNew(oneRM, sexConverted, age, bodyweight);
        break;
      case 'benchScoreReps':
        // Convert rep-based weight to 1RM using Epley formula
        const { weight: benchWeight, reps: benchReps } = data;
        const benchOneRM = epleyFormula(benchWeight, benchReps);
        result = calculateBenchScoreNew(benchOneRM, sexConverted, age, bodyweight);
        break;
      case 'deadliftScoreReps':
        // Convert rep-based weight to 1RM using Epley formula
        const { weight: dlWeight, reps: dlReps } = data;
        const dlOneRM = epleyFormula(dlWeight, dlReps);
        result = calculateDeadliftScoreNew(dlOneRM, sexConverted, age, bodyweight);
        break;
      case 'squat':
        // Handle rep-based squat scoring
        if (data.reps && data.reps > 1) {
          const squatOneRM = epleyFormula(data.value, data.reps);
          result = calculateSquatScoreNew(squatOneRM, sexConverted, age, bodyweight);
        } else {
          result = calculateSquatScoreNew(value, sexConverted, age, bodyweight);
        }
        break;
      case 'bench':
        // Handle rep-based bench scoring
        if (data.reps && data.reps > 1) {
          const benchOneRM = epleyFormula(data.value, data.reps);
          result = calculateBenchScoreNew(benchOneRM, sexConverted, age, bodyweight);
        } else {
          result = calculateBenchScoreNew(value, sexConverted, age, bodyweight);
        }
        break;
      case 'deadlift':
        // Handle rep-based deadlift scoring
        if (data.reps && data.reps > 1) {
          const deadliftOneRM = epleyFormula(data.value, data.reps);
          result = calculateDeadliftScoreNew(deadliftOneRM, sexConverted, age, bodyweight);
        } else {
          result = calculateDeadliftScoreNew(value, sexConverted, age, bodyweight);
        }
        break;
      case 'rowingScore':
        // For 500m row, value is in seconds; for others, value may be mm:ss
        let rowingTimeInSeconds;
        if (scoringSystemId === 'rowing_500m') {
          // Value is already in seconds - this is the time for 500m
          rowingTimeInSeconds = Number(value);
        } else {
          // Value is mm:ss string - for 2km row, convert to total time
          rowingTimeInSeconds = timeToSeconds(value);
        }
        // Pass time directly to the new rowing function
        result = challengerData.rowing500mScore(rowingTimeInSeconds, sexConverted, age, bodyweight);
        break;
      case 'rowingScoreSeconds':
        // For 500m row, value is already in seconds - this is the time for 500m
        const rowingTimeSeconds = Number(value);
        result = challengerData.rowing500mScore(rowingTimeSeconds, sexConverted, age, bodyweight);
        break;
      case 'rowing4minScore':
        // For 4-minute row, value is distance in meters
        const fourMinDistance = Number(value);
        result = challengerData.rowing4minScore(fourMinDistance, sexConverted, age, bodyweight);
        break;
      case 'bike500mScore':
        // For 500m bike, value is time in seconds
        const bikeTimeInSeconds = Number(value);
        result = challengerData.bikeScore(bikeTimeInSeconds, sexConverted, age);
        break;
      case 'ski500mScore':
        // For 500m ski, value is time in seconds
        const skiTimeInSeconds = Number(value);
        result = challengerData.skiScore(skiTimeInSeconds, sexConverted, age);
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
        const distanceForPace = value;
        const timeInSeconds = 120; // 2 minutes
        const pacePer500m = (timeInSeconds / distanceForPace) * 500;
        const distanceWatts = paceToWatts(pacePer500m);
        result = challengerData.rowing500mScore(distanceWatts, sexConverted, age, bodyweight);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported scoring system' }, { status: 400 });
    }

    const response = {
      score: result.score,
      percentile: result.percentile,
      scoringSystem: {
        id: scoringSystem.id,
        name: scoringSystem.name,
        category: scoringSystem.category,
      },
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
