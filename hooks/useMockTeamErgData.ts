import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket-client';

interface MockTeamErgConfig {
  sessionId: string;
  teamA: any;
  teamB: any;
  eventCompetitors: any[];
  eventType?: string;
  maxErgSlots?: number;
}

export function useMockTeamErgData(config: MockTeamErgConfig | null) {
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeCompetitorsRef = useRef<Map<string, any>>(new Map());

  const calculateScore = (metrics: any, baseLevel: number, fluctuation: number) => {
    // Create varied competitor profiles with different base levels
    const baseScore = baseLevel; // Base performance level (100-800)
    const paceVariation = Math.sin(Date.now() / 3000) * fluctuation; // Smooth fluctuation
    const randomVariation = (Math.random() - 0.5) * fluctuation * 0.3; // Small random variation

    const totalScore = baseScore + paceVariation + randomVariation;

    // Ensure it stays within 0-1000 range
    return Math.min(1000, Math.max(0, Math.round(totalScore)));
  };

  const addRandomCompetitor = () => {
    if (!config || !config.eventCompetitors.length) return;

    // Randomly select a competitor from the event
    const randomCompetitor =
      config.eventCompetitors[Math.floor(Math.random() * config.eventCompetitors.length)];

    // Count current active competitors per team to ensure even distribution
    const teamACount = Array.from(activeCompetitorsRef.current.values()).filter(
      (c) => c.teamId === config.teamA.id,
    ).length;
    const teamBCount = Array.from(activeCompetitorsRef.current.values()).filter(
      (c) => c.teamId === config.teamB.id,
    ).length;

    // Assign to the team with fewer competitors, or random if equal
    const randomTeam =
      teamACount < teamBCount
        ? config.teamA.id
        : teamBCount < teamACount
          ? config.teamB.id
          : Math.random() > 0.5
            ? config.teamA.id
            : config.teamB.id;

    console.log(
      'Adding competitor to team:',
      randomTeam,
      'Team A ID:',
      config.teamA.id,
      'Team B ID:',
      config.teamB.id,
    );

    const competitorData = {
      id: `${randomCompetitor.id}_sim_${Date.now()}`,
      name: `${randomCompetitor.name} (Sim)`,
      age: randomCompetitor.age || 25,
      sex: randomCompetitor.sex === 'M' ? ('male' as const) : ('female' as const),
      weight: randomCompetitor.bodyweight || 70,
    };

    // Find next available erg slot
    const ergSlotId = `erg_${activeCompetitorsRef.current.size + 1}`;

    // Add to active competitors with erg slot
    activeCompetitorsRef.current.set(competitorData.id, {
      ...competitorData,
      teamId: randomTeam,
      ergSlotId: ergSlotId,
      startTime: Date.now(),
    });

    const socket = getSocket();
    socket.connect();

    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);

    // Simulate the assignment process like real admin would do
    const assignment = {
      competitorId: competitorData.id,
      competitorName: competitorData.name,
      teamId: randomTeam,
      teamName: randomTeam === config.teamA.id ? config.teamA.name : config.teamB.name,
      ergSlotId: ergSlotId,
      eventType: config.eventType || 'rowing_500m', // Use session event type
    };

    console.log('Assigning competitor to erg slot:', assignment);
    socket.emit('team-competitor:assign', {
      sessionId: config.sessionId,
      assignment: assignment,
    });

    // Add a small delay to simulate admin assignment process
    setTimeout(() => {
      console.log('Competitor assignment completed, starting erg data...');
      // Simulate the competitor being assigned to an erg slot
      // This would trigger the erg slot to show as occupied in the admin panel
    }, 2000);

    // Schedule competitor to complete their session after 30-60 seconds
    setTimeout(
      () => {
        const socket = getSocket();
        const finalScore = Math.floor(Math.random() * 500) + 300; // Random final score

        console.log(
          `Competitor ${competitorData.name} completing session with final score: ${finalScore}`,
        );

        // Emit completion event - this should trigger team score update
        socket.emit('team-competitor:complete', {
          sessionId: config.sessionId,
          ergSlotId: ergSlotId,
          competitorId: competitorData.id,
          teamId: randomTeam,
          finalScore: finalScore,
        });

        // Remove from active competitors
        activeCompetitorsRef.current.delete(competitorData.id);

        console.log(`Competitor ${competitorData.name} removed from active list`);
      },
      30000 + Math.random() * 30000,
    ); // 30-60 seconds
  };

  const startMockData = () => {
    if (!config || isRunning) return;

    setIsRunning(true);
    startTimeRef.current = Date.now();

    const socket = getSocket();
    socket.connect();

    // Create varied competitor profiles with different base levels and fluctuations
    const competitorProfiles = [
      { baseLevel: 750, fluctuation: 50, name: 'Elite' }, // 700-800 range
      { baseLevel: 650, fluctuation: 45, name: 'Advanced' }, // 605-695 range
      { baseLevel: 550, fluctuation: 40, name: 'Intermediate' }, // 510-590 range
      { baseLevel: 450, fluctuation: 35, name: 'Recreational' }, // 415-485 range
      { baseLevel: 350, fluctuation: 30, name: 'Beginner' }, // 320-380 range
      { baseLevel: 250, fluctuation: 25, name: 'Novice' }, // 225-275 range
    ];

    console.log('Starting team erg mock data simulation...');

    // Add initial competitors
    addRandomCompetitor();
    setTimeout(() => addRandomCompetitor(), 5000); // Add second competitor after 5 seconds

    // Add competitors periodically
    const competitorInterval = setInterval(
      () => {
        const maxSlots = config?.maxErgSlots || 4;
        if (activeCompetitorsRef.current.size < maxSlots) {
          // Respect max erg slots
          addRandomCompetitor();
        }
      },
      15000 + Math.random() * 15000,
    ); // Add competitor every 15-30 seconds

    // Wait longer before starting to send erg data to ensure competitors are assigned to ergs
    setTimeout(() => {
      console.log('Starting to send erg data after assignment delay...');
      // Send erg data for active competitors
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds

        activeCompetitorsRef.current.forEach((competitor, competitorId) => {
          const competitorElapsed = (Date.now() - competitor.startTime) / 1000;

          // Randomly assign a profile to each competitor
          const profile = competitorProfiles[Math.floor(Math.random() * competitorProfiles.length)];

          const generateMetrics = (
            profile: (typeof competitorProfiles)[0],
            competitorIndex: number,
          ) => {
            const basePace = 90 + (1000 - profile.baseLevel) / 10; // Higher score = better pace
            const paceVariation = Math.sin(competitorElapsed / 3 + competitorIndex) * 15;
            const pace = Math.floor(basePace + paceVariation);

            const basePower = 150 + profile.baseLevel / 4; // Higher score = more power
            const powerVariation = Math.sin(competitorElapsed / 2 + competitorIndex) * 20;
            const power = Math.floor(basePower + powerVariation);

            return {
              pace: Math.max(80, Math.min(140, pace)), // Keep pace realistic
              distance: Math.floor(competitorElapsed * 4.2 + competitorIndex * 0.1), // Slight variation
              power: Math.max(100, Math.min(400, power)), // Keep power realistic
              heartRate: Math.floor(
                140 + profile.baseLevel / 20 + Math.sin(competitorElapsed / 4) * 15,
              ),
              strokeRate: Math.floor(
                24 + profile.baseLevel / 50 + Math.sin(competitorElapsed / 5) * 4,
              ),
              calories: Math.floor(competitorElapsed * 1.8 + competitorIndex * 0.1),
            };
          };

          const metrics = generateMetrics(profile, Math.random());
          const score = calculateScore(metrics, profile.baseLevel, profile.fluctuation);

          // Send team erg data
          const ergData = {
            sessionId: config.sessionId,
            teamId: competitor.teamId,
            participantId: competitorId,
            participantName: competitor.name,
            metrics: metrics,
            calculatedScore: score,
          };

          console.log('Sending team erg data:', ergData);
          socket.emit('team-erg:data', ergData);
        });
      }, 1000); // Send update every second
    }, 15000); // Wait 15 seconds before starting to send erg data (allows time for assignment)

    // Cleanup competitor interval
    setTimeout(() => {
      clearInterval(competitorInterval);
    }, 300000); // Stop adding competitors after 5 minutes
  };

  const stopMockData = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    activeCompetitorsRef.current.clear();
    setIsRunning(false);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isRunning,
    startMockData,
    stopMockData,
  };
}
