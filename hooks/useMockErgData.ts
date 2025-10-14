import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket-client';

interface MockErgConfig {
  sessionId: string;
  competitor1: any;
  competitor2: any;
}

export function useMockErgData(config: MockErgConfig | null) {
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const calculateScore = (metrics: any, baseLevel: number, fluctuation: number) => {
    // Create varied competitor profiles with different base levels
    const baseScore = baseLevel; // Base performance level (100-800)
    const paceVariation = Math.sin(Date.now() / 3000) * fluctuation; // Smooth fluctuation
    const randomVariation = (Math.random() - 0.5) * fluctuation * 0.3; // Small random variation

    const totalScore = baseScore + paceVariation + randomVariation;

    // Ensure it stays within 0-1000 range
    return Math.min(1000, Math.max(0, Math.round(totalScore)));
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

    // Randomly assign profiles to competitors
    const comp1Profile = competitorProfiles[Math.floor(Math.random() * competitorProfiles.length)];
    const comp2Profile = competitorProfiles[Math.floor(Math.random() * competitorProfiles.length)];

    console.log(
      `Mock data: Competitor 1 (${comp1Profile.name}) base: ${comp1Profile.baseLevel}±${comp1Profile.fluctuation}`,
    );
    console.log(
      `Mock data: Competitor 2 (${comp2Profile.name}) base: ${comp2Profile.baseLevel}±${comp2Profile.fluctuation}`,
    );

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds

      // Generate metrics based on competitor profile
      const generateMetrics = (profile: typeof comp1Profile, competitorIndex: number) => {
        const basePace = 90 + (1000 - profile.baseLevel) / 10; // Higher score = better pace
        const paceVariation = Math.sin(elapsed / 3 + competitorIndex) * 15;
        const pace = Math.floor(basePace + paceVariation);

        const basePower = 150 + profile.baseLevel / 4; // Higher score = more power
        const powerVariation = Math.sin(elapsed / 2 + competitorIndex) * 20;
        const power = Math.floor(basePower + powerVariation);

        return {
          pace: Math.max(80, Math.min(140, pace)), // Keep pace realistic
          distance: Math.floor(elapsed * 4.2 + competitorIndex * 0.1), // Slight variation
          power: Math.max(100, Math.min(400, power)), // Keep power realistic
          heartRate: Math.floor(140 + profile.baseLevel / 20 + Math.sin(elapsed / 4) * 15),
          strokeRate: Math.floor(24 + profile.baseLevel / 50 + Math.sin(elapsed / 5) * 4),
          calories: Math.floor(elapsed * 1.8 + competitorIndex * 0.1),
        };
      };

      // Competitor 1
      const comp1Metrics = generateMetrics(comp1Profile, 0);
      const comp1Score = calculateScore(
        comp1Metrics,
        comp1Profile.baseLevel,
        comp1Profile.fluctuation,
      );

      socket.emit('erg:data', {
        sessionId: config.sessionId,
        competitorIndex: 0,
        metrics: comp1Metrics,
        calculatedScore: comp1Score,
      });

      // Competitor 2
      const comp2Metrics = generateMetrics(comp2Profile, 1);
      const comp2Score = calculateScore(
        comp2Metrics,
        comp2Profile.baseLevel,
        comp2Profile.fluctuation,
      );

      socket.emit('erg:data', {
        sessionId: config.sessionId,
        competitorIndex: 1,
        metrics: comp2Metrics,
        calculatedScore: comp2Score,
      });

      // Auto-stop after 2000m (about 7-8 minutes)
      if (comp1Metrics.distance >= 2000 || comp2Metrics.distance >= 2000) {
        stopMockData();
      }
    }, 1000); // Send update every second
  };

  const stopMockData = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
