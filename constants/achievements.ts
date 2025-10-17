import { EVENT_TYPES } from './eventTypes';

// Canonical events are all events minus the 4-minute row
export const CANONICAL_EVENTS = EVENT_TYPES.filter((event) => event.id !== 'rowing_4min');

// Achievement types and definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  image: string;
  category: 'SCORE_THRESHOLD' | 'SPECIALIST' | 'PARTICIPATION';
  requirement: {
    type: 'VERIFIED_SCORE_MIN' | 'STRENGTH_AVERAGE' | 'ENDURANCE_AVERAGE' | 'HYBRID_AVERAGE';
    threshold: number;
  };
}

// Score threshold achievements (100-900)
export const SCORE_THRESHOLD_ACHIEVEMENTS: Achievement[] = [
  100, 200, 300, 400, 500, 600, 700, 800, 900,
].map((threshold) => ({
  id: `score_${threshold}`,
  name: `${threshold}+ Club`,
  description: `Achieved a verified score of ${threshold} or higher on any individual event`,
  image: `/achievement-images/${threshold}.png`,
  category: 'SCORE_THRESHOLD',
  requirement: {
    type: 'VERIFIED_SCORE_MIN',
    threshold,
  },
}));

// Competitor achievement - for any user with verified event scores
export const COMPETITOR_ACHIEVEMENT: Achievement = {
  id: 'competitor',
  name: 'Competitor',
  description: 'Participated in and achieved verified scores from events',
  image: '/achievement-images/competitor.png',
  category: 'PARTICIPATION',
  requirement: {
    type: 'VERIFIED_SCORE_MIN',
    threshold: 1, // Any verified score qualifies
  },
};

// Specialist achievements
export const SPECIALIST_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'strength_specialist',
    name: 'Strength Specialist',
    description:
      'Achieved an average verified score of 500+ across all strength events (Back Squat, Bench Press, Deadlift)',
    image: '/achievement-images/strength_spec.png',
    category: 'SPECIALIST',
    requirement: {
      type: 'STRENGTH_AVERAGE',
      threshold: 500,
    },
  },
  {
    id: 'endurance_specialist',
    name: 'Endurance Specialist',
    description:
      'Achieved an average verified score of 500+ across all endurance events (500m Row, 4km Bike, 500m Ski)',
    image: '/achievement-images/endurance_spec.png',
    category: 'SPECIALIST',
    requirement: {
      type: 'ENDURANCE_AVERAGE',
      threshold: 500,
    },
  },
  {
    id: 'hybrid_specialist',
    name: 'Hybrid Specialist',
    description: 'Achieved an average verified score of 500+ across all canonical events',
    image: '/achievement-images/hybrid_spec.png',
    category: 'SPECIALIST',
    requirement: {
      type: 'HYBRID_AVERAGE',
      threshold: 500,
    },
  },
];

// All achievements combined
export const ALL_ACHIEVEMENTS: Achievement[] = [
  COMPETITOR_ACHIEVEMENT,
  ...SCORE_THRESHOLD_ACHIEVEMENTS,
  ...SPECIALIST_ACHIEVEMENTS,
];

// Helper functions
export const getAchievementById = (id: string): Achievement | undefined => {
  return ALL_ACHIEVEMENTS.find((achievement) => achievement.id === id);
};

export const getCanonicalEventsByCategory = (category: 'STRENGTH' | 'ENDURANCE') => {
  return CANONICAL_EVENTS.filter((event) => event.category === category);
};

// For future enhancement: More sophisticated specialist logic
export const getSpecialistAchievementsWithFlexibility = (scores: Record<string, number>) => {
  // This could be enhanced to allow for flexibility where someone has 2 great events
  // but one dragging them down - could still award the badge
  // For now, using simple average logic
  return SPECIALIST_ACHIEVEMENTS;
};
