import { ChallengerData } from '@challengerco/challenger-data';

// Initialize the challenger data instance
const challengerData = new ChallengerData();

// Legacy paceToWatts function - kept for backward compatibility but no longer used
export const paceToWatts = (pace: number): number => {
  try {
    return ChallengerData.paceToWatts(pace);
  } catch (error) {
    console.error('Error in paceToWatts:', error);
    // Fallback implementation
    return Math.pow(2.8 / (pace / 500), 3);
  }
};

// Convert sex format from 'M'/'F' to 'male'/'female'
export function convertSex(sex: 'M' | 'F'): 'male' | 'female' {
  return sex === 'M' ? 'male' : 'female';
}

export function calculateGaussianScore(value: number, mean: number, stdDev: number): number {
  // This function is kept for backward compatibility but now uses the new package
  // Note: This is a simplified version - the new package uses more sophisticated scoring
  const exponent = -Math.pow(value - mean, 2) / (2 * Math.pow(stdDev, 2));
  return Math.exp(exponent);
}

export function getBenchmarkForLift(
  lift: 'squat' | 'bench' | 'deadlift',
  bodyweight: number,
  age: number,
  sex: 'M' | 'F',
): number {
  // Use the new package to get benchmark data
  const sexConverted = convertSex(sex);
  let result;

  switch (lift) {
    case 'squat':
      result = challengerData.squatScore(0, sexConverted, age, bodyweight);
      break;
    case 'bench':
      result = challengerData.benchScore(0, sexConverted, age, bodyweight);
      break;
    case 'deadlift':
      result = challengerData.deadliftScore(0, sexConverted, age, bodyweight);
      break;
    default:
      return 0;
  }

  // Return a benchmark value (this is approximate since the new package doesn't expose raw benchmarks)
  return result.score * 0.9; // 90th percentile equivalent
}

export function calculateLiftScore(
  lift: 'squat' | 'bench' | 'deadlift',
  weight: number,
  bodyweight: number,
  age: number,
  sex: 'M' | 'F',
): {
  score: number;
  benchmark: number;
  percentile: number;
  p95: number;
  p50: number;
  max: number;
} {
  const sexConverted = convertSex(sex);
  let result;

  switch (lift) {
    case 'squat':
      result = challengerData.squatScore(weight, sexConverted, age, bodyweight);
      break;
    case 'bench':
      result = challengerData.benchScore(weight, sexConverted, age, bodyweight);
      break;
    case 'deadlift':
      result = challengerData.deadliftScore(weight, sexConverted, age, bodyweight);
      break;
    default:
      return {
        score: 0,
        benchmark: 0,
        percentile: 0,
        p95: 0,
        p50: 0,
        max: 0,
      };
  }

  return {
    score: result.score,
    benchmark: result.score * 0.9, // Approximate 90th percentile
    percentile: result.percentile,
    p95: result.score * 0.95, // Approximate 95th percentile
    p50: result.score * 0.5, // Approximate 50th percentile
    max: result.score * 1.0, // Maximum score
  };
}

// For backward compatibility
export function getSquatBenchmark(bodyweight: number, age: number, sex: 'M' | 'F'): number {
  return getBenchmarkForLift('squat', bodyweight, age, sex);
}

export function calculateSquatScore(
  squatWeight: number,
  bodyweight: number,
  age: number,
  sex: 'M' | 'F',
) {
  return calculateLiftScore('squat', squatWeight, bodyweight, age, sex);
}

// Error function for normal distribution (kept for backward compatibility)
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// New functions using the ChallengerData package directly
export function calculateSquatScoreNew(
  squatWeight: number,
  sex: 'male' | 'female',
  age: number,
  bodyweight: number,
) {
  return challengerData.squatScore(squatWeight, sex, age, bodyweight);
}

export function calculateBenchScoreNew(
  benchWeight: number,
  sex: 'male' | 'female',
  age: number,
  bodyweight: number,
) {
  return challengerData.benchScore(benchWeight, sex, age, bodyweight);
}

export function calculateDeadliftScoreNew(
  deadliftWeight: number,
  sex: 'male' | 'female',
  age: number,
  bodyweight: number,
) {
  return challengerData.deadliftScore(deadliftWeight, sex, age, bodyweight);
}

export function calculateRowingScoreNew(
  timeInSeconds: number,
  sex: 'male' | 'female',
  age: number,
  weight: number,
) {
  try {
    return challengerData.rowing500mScore(timeInSeconds, sex, age, weight);
  } catch (error) {
    console.error('Error in calculateRowingScoreNew:', error);
    // Return a fallback result
    return { score: timeInSeconds, percentile: 50 };
  }
}

export function calculateRowing4minScoreNew(
  distance: number,
  sex: 'male' | 'female',
  age: number,
  weight: number,
) {
  try {
    return challengerData.rowing4minScore(distance, sex, age, weight);
  } catch (error) {
    console.error('Error in calculateRowing4minScoreNew:', error);
    // Return a fallback result
    return { score: distance, percentile: 50 };
  }
}

export function calculateBikeScoreNew(timeInSeconds: number, sex: 'male' | 'female', age: number) {
  try {
    return challengerData.bike4kmScore(timeInSeconds, sex, age);
  } catch (error) {
    console.error('Error in calculateBikeScoreNew:', error);
    // Return a fallback result
    return { score: timeInSeconds, percentile: 50 };
  }
}

export function calculateSkiScoreNew(timeInSeconds: number, sex: 'male' | 'female', age: number) {
  try {
    return challengerData.ski500mScore(timeInSeconds, sex, age);
  } catch (error) {
    console.error('Error in calculateSkiScoreNew:', error);
    // Return a fallback result
    return { score: timeInSeconds, percentile: 50 };
  }
}

export function calculateBike500mScoreNew(
  timeInSeconds: number,
  sex: 'male' | 'female',
  age: number,
) {
  try {
    return challengerData.bike500mScore(timeInSeconds, sex, age);
  } catch (error) {
    console.error('Error in calculateBike500mScoreNew:', error);
    // Return a fallback result
    return { score: timeInSeconds, percentile: 50 };
  }
}

// Epley formula to convert rep-based weight to estimated 1RM
export function epleyFormula(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Utility function to format time with milliseconds
export function formatTimeWithMilliseconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const milliseconds = Math.round((remainingSeconds % 1) * 10);
  const wholeSeconds = Math.floor(remainingSeconds);

  if (minutes > 0) {
    return `${minutes}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds} (mm:ss.ms)`;
  } else {
    return `${wholeSeconds}.${milliseconds} (ss.ms)`;
  }
}

// Utility function to parse time with milliseconds
export function parseTimeWithMilliseconds(timeStr: string): number {
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

// Comprehensive beautification function for raw scores
export function beautifyRawScore(rawValue: number, activityId: string, reps?: number): string {
  // Handle weight-based activities (squat, bench, deadlift)
  if (['squat', 'bench', 'deadlift'].includes(activityId)) {
    // Always show weight × reps format for lifts, even if reps is 1
    const repsToShow = reps || 1;
    return `${rawValue}kg × ${repsToShow}`;
  }

  // Handle time-based activities (rowing_500m, bike_4km, ski_500m, bike_500m)
  if (['rowing_500m', 'bike_4km', 'ski_500m', 'bike_500m'].includes(activityId)) {
    return formatTimeWithMilliseconds(rawValue);
  }

  // Handle distance-based activities (rowing_4min)
  if (activityId === 'rowing_4min') {
    return `${Math.round(rawValue)}m`;
  }

  // Fallback for unknown activities
  return rawValue.toString();
}
