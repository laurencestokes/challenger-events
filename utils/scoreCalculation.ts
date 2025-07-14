import { getScoringSystemById } from '@/constants/scoringSystems';
import { convertSex, epleyFormula, parseTimeWithMilliseconds } from '@/utils/scoring';
import { ChallengerData } from '@challengerco/challenger-data';
import { convertFirestoreTimestamp } from '@/lib/utils';

const challengerData = new ChallengerData();

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

export async function calculateScore(
    scoringSystemId: string,
    value: number,
    bodyweight: number,
    dateOfBirth: any,
    sex: 'M' | 'F',
) {
    const scoringSystem = getScoringSystemById(scoringSystemId);
    if (!scoringSystem) {
        throw new Error('Scoring system not found');
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

    const sexConverted = convertSex(sex);

    let result;

    switch (scoringSystem.calculationFunction) {
        case 'squatScore':
            result = challengerData.squatScore(value, sexConverted, age, bodyweight);
            break;
        case 'benchScore':
            result = challengerData.benchScore(value, sexConverted, age, bodyweight);
            break;
        case 'deadliftScore':
            result = challengerData.deadliftScore(value, sexConverted, age, bodyweight);
            break;
        case 'squatScoreReps':
            // Convert rep-based weight to 1RM using Epley formula
            const oneRM = epleyFormula(value, 1); // Assuming 1 rep for now
            result = challengerData.squatScore(oneRM, sexConverted, age, bodyweight);
            break;
        case 'benchScoreReps':
            // Convert rep-based weight to 1RM using Epley formula
            const benchOneRM = epleyFormula(value, 1); // Assuming 1 rep for now
            result = challengerData.benchScore(benchOneRM, sexConverted, age, bodyweight);
            break;
        case 'deadliftScoreReps':
            // Convert rep-based weight to 1RM using Epley formula
            const dlOneRM = epleyFormula(value, 1); // Assuming 1 rep for now
            result = challengerData.deadliftScore(dlOneRM, sexConverted, age, bodyweight);
            break;
        case 'squat':
            // Handle rep-based squat scoring
            result = challengerData.squatScore(value, sexConverted, age, bodyweight);
            break;
        case 'bench':
            // Handle rep-based bench scoring
            result = challengerData.benchScore(value, sexConverted, age, bodyweight);
            break;
        case 'deadlift':
            // Handle rep-based deadlift scoring
            result = challengerData.deadliftScore(value, sexConverted, age, bodyweight);
            break;
        case 'rowingScore':
            // For 500m row, value is in seconds; for others, value may be mm:ss
            let rowingTimeInSeconds;
            if (typeof value === 'string') {
                rowingTimeInSeconds = timeToSeconds(value);
            } else {
                rowingTimeInSeconds = value;
            }
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
            const timeSeconds = typeof value === 'string' ? timeToSeconds(value) : value;
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
            result = { score: value, percentile: 50 };
            break;
        case 'rowingScoreDistance':
            // For distance-based rowing, convert distance to equivalent time
            // Assuming a 2-minute time period, calculate equivalent 500m pace
            const distanceForPace = value;
            const timeInSeconds = 120; // 2 minutes
            const pacePer500m = (timeInSeconds / distanceForPace) * 500;
            const distanceWatts = Math.pow(2.8 / (pacePer500m / 500), 3); // Legacy paceToWatts
            result = challengerData.rowing500mScore(pacePer500m, sexConverted, age, bodyweight);
            break;
        default:
            throw new Error('Unsupported scoring system');
    }

    return {
        score: result.score,
        percentile: result.percentile,
        scoringSystem: {
            id: scoringSystem.id,
            name: scoringSystem.name,
            category: scoringSystem.category,
        },
    };
} 