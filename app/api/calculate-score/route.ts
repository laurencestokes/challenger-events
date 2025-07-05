import { NextResponse } from 'next/server';
import { ChallengerData } from '@challengerco/challenger-data';

// Initialize the challenger data instance
const challengerData = new ChallengerData();

function timeToSeconds(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

export async function POST(request: Request) {
  const data = await request.json();

  // Calculate powerlifting scores using the new package
  const squatResult = challengerData.squatScore(
    data.squat,
    data.sex,
    data.age,
    data.bodyMassKg,
  );

  const benchResult = challengerData.benchScore(
    data.bench,
    data.sex,
    data.age,
    data.bodyMassKg,
  );

  const deadliftResult = challengerData.deadliftScore(
    data.deadlift,
    data.sex,
    data.age,
    data.bodyMassKg,
  );

  // Calculate rowing score using the new package
  // Convert time to pace (seconds per 500m), then to watts
  const rowTimeSeconds = timeToSeconds(data.rowTime);
  const rowPace = rowTimeSeconds * 2; // Convert 2km time to 500m pace
  const rowWatts = ChallengerData.paceToWatts(rowPace);
  const rowResult = challengerData.rowingScore(rowWatts, data.sex, data.age, data.bodyMassKg);

  // Calculate ski score (using rowing as proxy for now - you may need to add ski data to the package)
  const skiTimeSeconds = timeToSeconds(data.skiTime);
  const skiPace = skiTimeSeconds; // Assuming 500m ski time
  const skiWatts = ChallengerData.paceToWatts(skiPace);
  const skiResult = challengerData.rowingScore(skiWatts, data.sex, data.age, data.bodyMassKg);

  // Calculate run score (using rowing as proxy for now - you may need to add run data to the package)
  const runTimeSeconds = timeToSeconds(data.runTime);
  const runPace = runTimeSeconds * 2; // Convert 1500m time to 500m equivalent pace
  const runWatts = ChallengerData.paceToWatts(runPace);
  const runResult = challengerData.rowingScore(runWatts, data.sex, data.age, data.bodyMassKg);

  const strengthTotal = (squatResult.score + benchResult.score + deadliftResult.score) / 3;
  const enduranceTotal = (rowResult.score + skiResult.score + runResult.score) / 3;
  const overall = (strengthTotal + enduranceTotal) / 2;

  return NextResponse.json({
    strength: {
      squat: {
        score: squatResult.score,
        percentile: squatResult.percentile,
      },
      bench: {
        score: benchResult.score,
        percentile: benchResult.percentile,
      },
      deadlift: {
        score: deadliftResult.score,
        percentile: deadliftResult.percentile,
      },
      total: strengthTotal,
    },
    endurance: {
      row: {
        score: rowResult.score,
        percentile: rowResult.percentile,
        watts: rowWatts,
      },
      ski: {
        score: skiResult.score,
        percentile: skiResult.percentile,
        watts: skiWatts,
      },
      run: {
        score: runResult.score,
        percentile: runResult.percentile,
        watts: runWatts,
      },
      total: enduranceTotal,
    },
    overall,
  });
}
