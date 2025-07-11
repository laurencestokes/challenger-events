# Workout Management

This document describes the workout management feature that allows admins to add workouts to events with scoring system selection.

## Overview

Admins can now add workouts (activities) to events and select from predefined scoring systems. This allows for flexible event creation with standardized scoring across different types of exercises.

## Available Scoring Systems

### Strength Exercises
- **Squat**: Back squat scoring based on bodyweight, age, and sex
- **Bench Press**: Bench press scoring based on bodyweight, age, and sex  
- **Deadlift**: Deadlift scoring based on bodyweight, age, and sex
- **Custom Weight**: Simple weight-based scoring (no age/sex adjustments)

### Endurance Exercises
- **Rowing**: 2km rowing scoring based on time, age, and sex
- **Custom Time**: Time-based scoring (faster is better)
- **Custom Reps**: Rep-based scoring (more reps is better)
- **Custom Distance**: Distance-based scoring (longer distance is better)

## How to Add Workouts to Events

1. Navigate to an event detail page as an admin
2. Click the "Add Workout" button in the Workouts section
3. Fill in the workout details:
   - **Name**: The name of the workout (e.g., "Back Squat", "2km Row")
   - **Description**: Optional description of the workout
   - **Input Type**: Select the type of input (Weight, Time, Reps, Distance, Custom)
   - **Scoring System**: Choose from available scoring systems for the selected input type
   - **Unit**: The unit of measurement (e.g., kg, mm:ss, reps, m)

4. Click "Add Workout" to save

## API Endpoints

### Get Available Scoring Systems
```
GET /api/scoring-systems
```

Query parameters:
- `category`: Filter by category (STRENGTH, ENDURANCE, MIXED)
- `inputType`: Filter by input type (WEIGHT, TIME, DISTANCE, REPS, CUSTOM)

### Add Workout to Event
```
POST /api/events/{eventId}/activities
```

Request body:
```json
{
  "name": "Back Squat",
  "description": "3 rep max back squat",
  "type": "WEIGHT",
  "scoringSystemId": "squat",
  "unit": "kg"
}
```

### Get Event Workouts
```
GET /api/events/{eventId}/activities
```

### Update Workout
```
PUT /api/events/{eventId}/activities/{activityId}
```

### Delete Workout
```
DELETE /api/events/{eventId}/activities/{activityId}
```

## Calculate Score for Workout
```
POST /api/calculate-score
```

Request body:
```json
{
  "scoringSystemId": "squat",
  "value": 150,
  "bodyweight": 80,
  "age": 25,
  "sex": "M"
}
```

Response:
```json
{
  "score": 85.2,
  "percentile": 75,
  "scoringSystem": {
    "id": "squat",
    "name": "Squat",
    "category": "STRENGTH"
  }
}
```

## Database Schema

### Activities Collection
```typescript
interface Activity {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  scoringSystemId?: string; // Reference to scoring system
  maxScore?: number;
  unit?: string;
  order: number;
  createdAt: Date;
}
```

## Adding New Scoring Systems

To add new scoring systems:

1. Update the `SCORING_SYSTEMS` array in `constants/scoringSystems.ts`
2. Add the corresponding calculation function in `app/api/calculate-score/route.ts`
3. Update the scoring system interface if needed

Example:
```typescript
{
  id: 'new_exercise',
  name: 'New Exercise',
  description: 'Description of the new exercise',
  category: 'STRENGTH',
  inputType: 'WEIGHT',
  unit: 'kg',
  requiresBodyweight: true,
  requiresAge: true,
  requiresSex: true,
  calculationFunction: 'newExerciseScore',
}
```

## Future Enhancements

- Support for more complex scoring algorithms
- Custom scoring system creation by admins
- Integration with external fitness APIs
- Advanced analytics and benchmarking
- Support for team-based scoring
- Multi-round event support 