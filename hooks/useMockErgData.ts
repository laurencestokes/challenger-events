import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket-client';
import { Competitor } from '@/hooks/useErgSocket';

interface MockErgConfig {
  sessionId: string;
  competitors: Competitor[];
}

export function useMockErgData(config: MockErgConfig | null) {
  const [isRunning, setIsRunning] = useState(false);
  const [autoRestartEnabled, setAutoRestartEnabled] = useState(false);
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
    if (!config || isRunning) {
      return;
    }
    setAutoRestartEnabled(true); // Enable auto-restart when manually started
    startMockDataWithConfig(config);
  };

  const stopMockData = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setAutoRestartEnabled(false); // Disable auto-restart when manually stopped
    currentConfigRef.current = null;
  }, []);

  // Start mock data with a specific config (used for competitor updates)
  const startMockDataWithConfig = useCallback(
    (mockConfig: MockErgConfig) => {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setIsRunning(true);
      startTimeRef.current = Date.now();
      currentConfigRef.current = mockConfig;

      const socket = getSocket();

      // Ensure socket is connected before starting
      const initializeDataGeneration = () => {
        // Create varied competitor profiles with different base levels and fluctuations
        const competitorProfiles = [
          { baseLevel: 750, fluctuation: 50, name: 'Elite' }, // 700-800 range
          { baseLevel: 650, fluctuation: 45, name: 'Advanced' }, // 605-695 range
          { baseLevel: 550, fluctuation: 40, name: 'Intermediate' }, // 510-590 range
          { baseLevel: 450, fluctuation: 35, name: 'Recreational' }, // 415-485 range
          { baseLevel: 350, fluctuation: 30, name: 'Beginner' }, // 320-380 range
          { baseLevel: 250, fluctuation: 25, name: 'Novice' }, // 225-275 range
        ];

        const intervalId = setInterval(() => {
          const currentConfig = currentConfigRef.current;
          if (!currentConfig) {
            stopMockData();
            return;
          }
          const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds

          // Randomly assign profiles to competitors (reassign each tick to ensure fresh data)
          const competitorProfilesAssigned = currentConfig.competitors.map(
            () => competitorProfiles[Math.floor(Math.random() * competitorProfiles.length)],
          );

          // Generate metrics based on competitor profile
          const generateMetrics = (
            profile: (typeof competitorProfilesAssigned)[0],
            competitorIndex: number,
          ) => {
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

          let maxDistance = 0;

          // Generate data for all competitors
          currentConfig.competitors.forEach((competitor, index) => {
            const profile = competitorProfilesAssigned[index];
            const metrics = generateMetrics(profile, index);
            const score = calculateScore(metrics, profile.baseLevel, profile.fluctuation);

            const ergData = {
              sessionId: currentConfig.sessionId,
              competitorIndex: index,
              metrics,
              calculatedScore: score,
              timestamp: new Date().toISOString(),
            };
            socket.emit('erg:data', ergData);

            maxDistance = Math.max(maxDistance, metrics.distance_m);
          });

          // Auto-stop after 2000m (about 7-8 minutes)
          if (maxDistance >= 2000) {
            stopMockData();
          }
        }, 1000); // Send update every second

        intervalRef.current = intervalId;
      };

      socketRef.current = socket;

      // Wait for socket connection before starting data generation
      if (!socket.connected) {
        socket.connect();
        socket.once('connect', () => {
          initializeDataGeneration();
        });
      } else {
        initializeDataGeneration();
      }
    },
    [stopMockData],
  );

  // Handle competitor updates - restart mock data with new competitors
  useEffect(() => {
    const handleCompetitorsUpdated = (data: any) => {
      if (data.sessionId === config?.sessionId && config?.sessionId && autoRestartEnabled) {
        // Update the config with new competitor data
        const newConfig: MockErgConfig = {
          sessionId: config.sessionId,
          competitors: data.competitors,
        };

        // Clear the interval immediately
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRunning(false);
        currentConfigRef.current = null;

        // Longer delay to ensure cleanup, then restart
        setTimeout(() => {
          startMockDataWithConfig(newConfig);
        }, 500);
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
