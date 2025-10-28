export interface EventType {
  id: string;
  name: string;
  description: string;
  category: 'STRENGTH' | 'ENDURANCE';
  scoringSystemId: string;
  inputType: 'WEIGHT' | 'TIME' | 'DISTANCE';
  unit: string;
  supportsReps: boolean;
  minReps?: number;
  maxReps?: number;
  defaultReps?: number;
}

export const EVENT_TYPES: EventType[] = [
  {
    id: 'squat',
    name: 'Back Squat',
    description: 'Back squat with scoring based on bodyweight, age, and sex',
    category: 'STRENGTH',
    scoringSystemId: 'squat',
    inputType: 'WEIGHT',
    unit: 'kg',
    supportsReps: true,
    minReps: 1,
    maxReps: 10,
    defaultReps: 1,
  },
  {
    id: 'bench',
    name: 'Bench Press',
    description: 'Bench press with scoring based on bodyweight, age, and sex',
    category: 'STRENGTH',
    scoringSystemId: 'bench',
    inputType: 'WEIGHT',
    unit: 'kg',
    supportsReps: true,
    minReps: 1,
    maxReps: 10,
    defaultReps: 1,
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    description: 'Deadlift with scoring based on bodyweight, age, and sex',
    category: 'STRENGTH',
    scoringSystemId: 'deadlift',
    inputType: 'WEIGHT',
    unit: 'kg',
    supportsReps: true,
    minReps: 1,
    maxReps: 10,
    defaultReps: 1,
  },
  {
    id: 'rowing_500m',
    name: '500m Row',
    description: '500m rowing with scoring based on time, age, and sex',
    category: 'ENDURANCE',
    scoringSystemId: 'rowing_500m',
    inputType: 'TIME',
    unit: 'seconds',
    supportsReps: false,
  },
  {
    id: 'rowing_4min',
    name: '4-Minute Row',
    description: '4-minute rowing with scoring based on distance, age, and sex',
    category: 'ENDURANCE',
    scoringSystemId: 'rowing_4min',
    inputType: 'DISTANCE',
    unit: 'm',
    supportsReps: false,
  },
  {
    id: 'bike_4km',
    name: '4km Bike',
    description: '4km bike with scoring based on time, age, and sex',
    category: 'ENDURANCE',
    scoringSystemId: 'bike_4km',
    inputType: 'TIME',
    unit: 'seconds',
    supportsReps: false,
  },
  {
    id: 'ski_500m',
    name: '500m Ski',
    description: '500m ski with scoring based on time, age, and sex',
    category: 'ENDURANCE',
    scoringSystemId: 'ski_500m',
    inputType: 'TIME',
    unit: 'seconds',
    supportsReps: false,
  },
  {
    id: 'bike_500m',
    name: '500m Bike',
    description: '500m bike with scoring based on time, age, and sex',
    category: 'ENDURANCE',
    scoringSystemId: 'bike_500m',
    inputType: 'TIME',
    unit: 'seconds',
    supportsReps: false,
  },
];

export const getEventTypeById = (id: string): EventType | undefined => {
  return EVENT_TYPES.find((type) => type.id === id);
};

export const getEventTypesByCategory = (category: EventType['category']): EventType[] => {
  return EVENT_TYPES.filter((type) => type.category === category);
};
