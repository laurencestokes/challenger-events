import { parse } from 'csv-parse/sync';
import fs from 'fs';

interface PowerliftingEntry {
  Name: string;
  Sex: 'M' | 'F';
  Equipment: string;
  Age: number;
  BodyweightKg: number;
  Best3SquatKg: number;
  Best3BenchKg: number;
  Best3DeadliftKg: number;
  Tested: string;
  Federation: string;
  Date: string;
}

type AgeGroup = 'Junior' | 'Open' | 'Masters1' | 'Masters2' | 'Masters3';

interface LiftStats {
  p95: number;
  p90: number;
  p75: number;
  p50: number;
  max: number;
  count: number;
}

interface GroupStats {
  squat: LiftStats;
  bench: LiftStats;
  deadlift: LiftStats;
}

interface CalibrationValues {
  groups: {
    [sex: string]: {
      [weightClass: string]: {
        [ageGroup: string]: GroupStats;
      };
    };
  };
}

function getWeightClass(bodyweight: number, sex: 'M' | 'F'): string {
  const weightClasses = {
    M: [59, 66, 74, 83, 93, 105, 120],
    F: [47, 52, 57, 63, 69, 76, 84],
  };

  const classes = weightClasses[sex];
  for (let i = 0; i < classes.length; i++) {
    if (bodyweight <= classes[i]) {
      return `${classes[i]}kg`;
    }
  }
  return `${classes[classes.length - 1]}+kg`;
}

function getAgeGroup(age: number): AgeGroup {
  if (age < 23) return 'Junior';
  if (age < 40) return 'Open';
  if (age < 50) return 'Masters1';
  if (age < 60) return 'Masters2';
  return 'Masters3';
}

async function analyzeData(filePath: string): Promise<CalibrationValues> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records: PowerliftingEntry[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Filter for valid records
  const validRecords = records.filter((record) => {
    return (
      // Only raw lifts
      record.Equipment === 'Raw' &&
      // Valid lifts
      record.Best3SquatKg > 0 &&
      record.Best3BenchKg > 0 &&
      record.Best3DeadliftKg > 0 &&
      // Valid bodyweight
      record.BodyweightKg > 0 &&
      // Only M/F
      (record.Sex === 'M' || record.Sex === 'F') &&
      // Recent competitions
      new Date(record.Date) > new Date('2015-01-01')
    );
  });

  // Group records by sex, weight class, and age group
  const groups: { [key: string]: { squat: number[]; bench: number[]; deadlift: number[] } } = {};
  validRecords.forEach((record) => {
    const sex = record.Sex;
    const weightClass = getWeightClass(record.BodyweightKg, sex);
    const ageGroup = getAgeGroup(record.Age);
    const key = `${sex}-${weightClass}-${ageGroup}`;

    if (!groups[key]) {
      groups[key] = {
        squat: [],
        bench: [],
        deadlift: [],
      };
    }
    groups[key].squat.push(record.Best3SquatKg);
    groups[key].bench.push(record.Best3BenchKg);
    groups[key].deadlift.push(record.Best3DeadliftKg);
  });

  // Calculate percentiles for each group
  const calibrationValues: CalibrationValues = {
    groups: {},
  };

  Object.entries(groups).forEach(([key, lifts]) => {
    const [sex, weightClass, ageGroup] = key.split('-');

    // Initialize nested structure if it doesn't exist
    if (!calibrationValues.groups[sex]) {
      calibrationValues.groups[sex] = {};
    }
    if (!calibrationValues.groups[sex][weightClass]) {
      calibrationValues.groups[sex][weightClass] = {};
    }

    const getPercentileValue = (arr: number[], percentile: number) => {
      if (arr.length === 0) return 0;

      // For a descending sorted array, we want the value at position n * ((100-p)/100)
      // where n is the number of observations and p is the desired percentile
      const invertedPercentile = 100 - percentile;
      const position = (arr.length - 1) * (invertedPercentile / 100);
      const index = Math.floor(position);

      // If position is a whole number, return that value
      if (index === position) {
        return Number(arr[index].toFixed(1));
      }

      // Interpolate between the two nearest values
      const remainder = position - index;
      const lower = arr[index];
      const upper = arr[Math.min(index + 1, arr.length - 1)];
      const value = lower + (upper - lower) * remainder;

      return Number(value.toFixed(1));
    };

    const calculateStats = (liftArray: number[]): LiftStats | null => {
      // Only calculate stats if we have enough data points (at least 10)
      if (liftArray.length < 10) return null;

      // Convert strings to numbers and sort in descending order
      const numericLifts = liftArray.map((lift) => Number(lift)).sort((a, b) => b - a);

      return {
        p95: getPercentileValue(numericLifts, 95),
        p90: getPercentileValue(numericLifts, 90),
        p75: getPercentileValue(numericLifts, 75),
        p50: getPercentileValue(numericLifts, 50),
        max: numericLifts[0],
        count: numericLifts.length,
      };
    };

    const squatStats = calculateStats(lifts.squat);
    const benchStats = calculateStats(lifts.bench);
    const deadliftStats = calculateStats(lifts.deadlift);

    // Only add the group if we have valid stats for all lifts
    if (squatStats && benchStats && deadliftStats) {
      calibrationValues.groups[sex][weightClass][ageGroup] = {
        squat: squatStats,
        bench: benchStats,
        deadlift: deadliftStats,
      };

      // Log the results for this group
      console.log(`\n${sex} ${weightClass} ${ageGroup}:`);
      console.log('Squat (n=${squatStats.count}):');
      console.log('  95th percentile:', squatStats.p95);
      console.log('  90th percentile:', squatStats.p90);
      console.log('  Max:', squatStats.max);
      console.log('Bench (n=${benchStats.count}):');
      console.log('  95th percentile:', benchStats.p95);
      console.log('  90th percentile:', benchStats.p90);
      console.log('  Max:', benchStats.max);
      console.log('Deadlift (n=${deadliftStats.count}):');
      console.log('  95th percentile:', deadliftStats.p95);
      console.log('  90th percentile:', deadliftStats.p90);
      console.log('  Max:', deadliftStats.max);
    }
  });

  // Save calibration values
  if (!fs.existsSync('constants')) {
    fs.mkdirSync('constants', { recursive: true });
  }

  fs.writeFileSync(
    'constants/liftingStandards.ts',
    `// Generated from OpenPowerlifting data
// Includes only Raw lifts from 2015 onwards
export const LIFTING_STANDARDS = ${JSON.stringify(calibrationValues, null, 2)};`,
  );

  // Log some statistics
  console.log('\nAnalysis complete!');
  console.log('Total valid records:', validRecords.length);

  return calibrationValues;
}

// If this script is run directly (not imported as a module)
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Please provide the path to the CSV file as an argument');
    process.exit(1);
  }

  analyzeData(args[0]).catch((error) => {
    console.error('Error analyzing data:', error);
    process.exit(1);
  });
}
