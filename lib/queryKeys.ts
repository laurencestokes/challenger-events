export const queryKeys = {
  events: {
    all: () => ['events'] as const,
    available: () => ['events', 'available'] as const,
    detail: (id: string) => ['events', id] as const,
    activities: (id: string) => ['events', id, 'activities'] as const,
    leaderboard: (id: string) => ['events', id, 'leaderboard'] as const,
    participants: (id: string) => ['events', id, 'participants'] as const,
    competitionVerification: (id: string) => ['events', id, 'competition-verification'] as const,
  },
  scoringSystems: () => ['scoring-systems'] as const,
  teams: {
    all: () => ['teams'] as const,
    public: () => ['teams', 'public'] as const,
    detail: (id: string) => ['teams', id] as const,
    pendingInvitations: (id: string) => ['teams', id, 'invitations', 'pending'] as const,
  },
  users: {
    all: () => ['admin', 'users'] as const,
    profile: () => ['user', 'profile'] as const,
    scores: () => ['user', 'scores'] as const,
    events: () => ['user', 'events'] as const,
  },
  public: {
    profile: (userId: string) => ['public', 'profile', userId] as const,
    leaderboard: (eventId: string) => ['public', 'leaderboard', eventId] as const,
    event: (eventId: string) => ['public', 'events', eventId] as const,
    activities: (eventId: string) => ['public', 'events', eventId, 'activities'] as const,
    userEvents: (userId: string) => ['public', 'user', 'events', userId] as const,
  },
  admin: {
    images: () => ['admin', 'images'] as const,
    erg: {
      sessions: () => ['erg', 'sessions'] as const,
    },
  },
};
