import { useEffect, useRef, useState, useCallback } from 'react';
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
  const currentConfigRef = useRef<MockErgConfig | null>(null);
  const socketRef = useRef<any>(null);

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
    startMockDataWithConfig(config);
  };

  const stopMockData = useCallback(() => {
    console.log('Stopping mock data...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    currentConfigRef.current = null;
    console.log('Mock data stopped');
  }, []);

  // Start mock data with a specific config (used for competitor updates)
  const startMockDataWithConfig = useCallback(
    (mockConfig: MockErgConfig) => {
      // Always allow restarting with new config (for competitor updates)
      console.log('Starting mock data with config:', mockConfig);

      setIsRunning(true);
      startTimeRef.current = Date.now();
      currentConfigRef.current = mockConfig;

      const socket = getSocket();
      socket.connect();
      socketRef.current = socket;

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
      const comp1Profile =
        competitorProfiles[Math.floor(Math.random() * competitorProfiles.length)];
      const comp2Profile =
        competitorProfiles[Math.floor(Math.random() * competitorProfiles.length)];

      console.log(
        `Mock data: Competitor 1 (${comp1Profile.name}) - ${mockConfig.competitor1?.name || 'Unknown'} - base: ${comp1Profile.baseLevel}±${comp1Profile.fluctuation}`,
      );
      console.log(
        `Mock data: Competitor 2 (${comp2Profile.name}) - ${mockConfig.competitor2?.name || 'Unknown'} - base: ${comp2Profile.baseLevel}±${comp2Profile.fluctuation}`,
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
            average_pace_s: Math.max(80, Math.min(140, pace)), // Keep pace realistic
            distance_m: Math.floor(elapsed * 4.2 + competitorIndex * 0.1), // Slight variation
            average_power_W: Math.max(100, Math.min(400, power)), // Keep power realistic
            duration_s: elapsed,
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
          sessionId: mockConfig.sessionId,
          competitorIndex: 0,
          metrics: comp1Metrics,
          calculatedScore: comp1Score,
          timestamp: new Date().toISOString(),
        });

        // Competitor 2
        const comp2Metrics = generateMetrics(comp2Profile, 1);
        const comp2Score = calculateScore(
          comp2Metrics,
          comp2Profile.baseLevel,
          comp2Profile.fluctuation,
        );

        socket.emit('erg:data', {
          sessionId: mockConfig.sessionId,
          competitorIndex: 1,
          metrics: comp2Metrics,
          calculatedScore: comp2Score,
          timestamp: new Date().toISOString(),
        });

        // Auto-stop after 2000m (about 7-8 minutes)
        if (comp1Metrics.distance_m >= 2000 || comp2Metrics.distance_m >= 2000) {
          stopMockData();
        }
      }, 1000); // Send update every second
    },
    [stopMockData],
  );

  // Handle competitor updates - restart mock data with new competitors
  useEffect(() => {
    const handleCompetitorsUpdated = (data: any) => {
      console.log('Mock data: Competitors updated, restarting with new data:', data);
      console.log('Current isRunning state:', isRunning);
      console.log('Session ID match:', data.sessionId === config?.sessionId);

      if (data.sessionId === config?.sessionId && config?.sessionId) {
        // Update the config with new competitor data
        const newConfig: MockErgConfig = {
          sessionId: config.sessionId,
          competitor1: data.competitor1,
          competitor2: data.competitor2,
        };

        console.log('Stopping current mock data and restarting with new config:', newConfig);

        // Stop current mock data and restart with new competitors
        stopMockData();

        // Small delay to ensure cleanup, then restart
        setTimeout(() => {
          console.log('Restarting mock data after competitor update...');
          startMockDataWithConfig(newConfig);
        }, 100);
      } else {
        console.log('Not restarting mock data - session ID mismatch or no config');
      }
    };

    const socket = getSocket();
    socket.on('session:competitors-updated', handleCompetitorsUpdated);

    return () => {
      socket.off('session:competitors-updated', handleCompetitorsUpdated);
    };
  }, [isRunning, config?.sessionId, stopMockData, startMockDataWithConfig]);

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
