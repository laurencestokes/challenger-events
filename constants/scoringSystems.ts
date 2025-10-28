export interface ScoringSystem {
  id: string;
  name: string;
  description: string;
  category: 'STRENGTH' | 'ENDURANCE' | 'MIXED';
  inputType: 'WEIGHT' | 'TIME' | 'DISTANCE' | 'REPS' | 'CUSTOM';
  unit?: string;
  requiresBodyweight: boolean;
  requiresAge: boolean;
  requiresSex: boolean;
  calculationFunction: string; // Reference to the calculation function
}

export const SCORING_SYSTEMS: ScoringSystem[] = [
  {
    id: 'squat',
    name: 'Squat',
    description: 'Back squat scoring based on bodyweight, age, and sex',
    category: 'STRENGTH',
    inputType: 'WEIGHT',
    unit: 'kg',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'squatScore',
  },
  {
    id: 'bench',
    name: 'Bench Press',
    description: 'Bench press scoring based on bodyweight, age, and sex',
    category: 'STRENGTH',
    inputType: 'WEIGHT',
    unit: 'kg',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'benchScore',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    description: 'Deadlift scoring based on bodyweight, age, and sex',
    category: 'STRENGTH',
    inputType: 'WEIGHT',
    unit: 'kg',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'deadliftScore',
  },
  {
    id: 'rowing',
    name: 'Rowing',
    description: '2km rowing scoring based on time, age, and sex',
    category: 'ENDURANCE',
    inputType: 'TIME',
    unit: 'mm:ss',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'rowingScore',
  },
  {
    id: 'rowing_500m',
    name: '500m Row',
    description: '500m rowing scoring based on time, age, and sex',
    category: 'ENDURANCE',
    inputType: 'TIME',
    unit: 'seconds',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'rowingScoreSeconds',
  },
  {
    id: 'rowing_500m_distance',
    name: '500m Row (Distance)',
    description: '500m rowing scoring applied to distance input (for max distance challenges)',
    category: 'ENDURANCE',
    inputType: 'DISTANCE',
    unit: 'm',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'rowingScoreDistance',
  },
  {
    id: 'custom_weight',
    name: 'Custom Weight',
    description: 'Custom weight-based scoring (no age/sex adjustments)',
    category: 'STRENGTH',
    inputType: 'WEIGHT',
    unit: 'kg',
    requiresBodyweight: false,
    requiresAge: false,
    requiresSex: false,
    calculationFunction: 'customWeight',
  },
  {
    id: 'custom_time',
    name: 'Custom Time',
    description: 'Custom time-based scoring (faster is better)',
    category: 'ENDURANCE',
    inputType: 'TIME',
    unit: 'mm:ss',
    requiresBodyweight: false,
    requiresAge: false,
    requiresSex: false,
    calculationFunction: 'customTime',
  },
  {
    id: 'custom_reps',
    name: 'Custom Reps',
    description: 'Custom rep-based scoring (more reps is better)',
    category: 'ENDURANCE',
    inputType: 'REPS',
    unit: 'reps',
    requiresBodyweight: false,
    requiresAge: false,
    requiresSex: false,
    calculationFunction: 'customReps',
  },
  {
    id: 'custom_distance',
    name: 'Custom Distance',
    description: 'Custom distance-based scoring (longer distance is better)',
    category: 'ENDURANCE',
    inputType: 'DISTANCE',
    unit: 'm',
    requiresBodyweight: false,
    requiresAge: false,
    requiresSex: false,
    calculationFunction: 'customDistance',
  },
  {
    id: 'rowing_distance',
    name: 'Rowing Distance',
    description: 'Rowing distance scoring (longer distance in time period is better)',
    category: 'ENDURANCE',
    inputType: 'DISTANCE',
    unit: 'm',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'rowingDistance',
  },
  {
    id: 'rowing_4min',
    name: '4-Minute Row',
    description: '4-minute rowing scoring based on distance, age, and sex',
    category: 'ENDURANCE',
    inputType: 'DISTANCE',
    unit: 'm',
    requiresBodyweight: true,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'rowing4minScore',
  },
  {
    id: 'bike_4km',
    name: '4km Bike',
    description: '4km bike scoring based on time, age, and sex',
    category: 'ENDURANCE',
    inputType: 'TIME',
    unit: 'seconds',
    requiresBodyweight: false,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'bike4kmScore',
  },
  {
    id: 'ski_500m',
    name: '500m Ski',
    description: '500m ski scoring based on time, age, and sex',
    category: 'ENDURANCE',
    inputType: 'TIME',
    unit: 'seconds',
    requiresBodyweight: false,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'ski500mScore',
  },
  {
    id: 'bike_500m',
    name: '500m Bike',
    description: '500m bike scoring based on time, age, and sex',
    category: 'ENDURANCE',
    inputType: 'TIME',
    unit: 'seconds',
    requiresBodyweight: false,
    requiresAge: true,
    requiresSex: true,
    calculationFunction: 'bike500mScore',
  },
];

export const getScoringSystemById = (id: string): ScoringSystem | undefined => {
  return SCORING_SYSTEMS.find((system) => system.id === id);
};

export const getScoringSystemsByCategory = (
  category: ScoringSystem['category'],
): ScoringSystem[] => {
  return SCORING_SYSTEMS.filter((system) => system.category === category);
};

export const getScoringSystemsByInputType = (
  inputType: ScoringSystem['inputType'],
): ScoringSystem[] => {
  return SCORING_SYSTEMS.filter((system) => system.inputType === inputType);
};
