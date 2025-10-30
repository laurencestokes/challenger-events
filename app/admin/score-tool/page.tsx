'use client';

import { useState, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { EVENT_TYPES, type EventType } from '@/constants/eventTypes';
import { calculateScore } from '@/utils/scoreCalculation';
import WelcomeSection from '@/components/WelcomeSection';

type Sex = 'M' | 'F';

export default function AdminScoreToolPage() {
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('M');
  const [bodyweight, setBodyweight] = useState<string>('70');
  const [age, setAge] = useState<string>('25');
  const [selectedEventId, setSelectedEventId] = useState<string>(EVENT_TYPES[0]?.id ?? 'squat');
  const [value, setValue] = useState<string>('');
  const [reps, setReps] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; system: string } | null>(null);

  const selectedEvent: EventType | undefined = useMemo(
    () => EVENT_TYPES.find((e) => e.id === selectedEventId),
    [selectedEventId],
  );

  const requiresReps = !!selectedEvent?.supportsReps;

  const valueLabel = useMemo(() => {
    if (!selectedEvent) return 'Value';
    switch (selectedEvent.inputType) {
      case 'WEIGHT':
        return `Weight (${selectedEvent.unit ?? 'kg'})`;
      case 'TIME':
        return selectedEvent.unit === 'seconds'
          ? 'Time (seconds, e.g. 86.3)'
          : 'Time (mm:ss or ss.ms)';
      case 'DISTANCE':
        return `Distance (${selectedEvent.unit ?? 'm'})`;
      default:
        return 'Value';
    }
  }, [selectedEvent]);

  function parseTimeToSeconds(input: string): number {
    const trimmed = input.trim();
    if (!trimmed) return NaN;
    if (trimmed.includes(':')) {
      const [m, sPart] = trimmed.split(':');
      const minutes = Number(m);
      if (isNaN(minutes)) return NaN;
      // Support seconds with optional .ms e.g., 26.3
      if (sPart.includes('.')) {
        const [secStr, msStr] = sPart.split('.');
        const sec = Number(secStr);
        const msTenths = Number(msStr);
        if (isNaN(sec) || isNaN(msTenths)) return NaN;
        return minutes * 60 + sec + msTenths / 10;
      }
      const secondsOnly = Number(sPart);
      if (isNaN(secondsOnly)) return NaN;
      return minutes * 60 + secondsOnly;
    }
    // Support dotted format m.ss.ms e.g., 1.26.3
    const dotParts = trimmed.split('.');
    if (dotParts.length === 3) {
      const [mStr, sStr, msStr] = dotParts;
      const minutes = Number(mStr);
      const seconds = Number(sStr);
      const msTenths = Number(msStr);
      if (isNaN(minutes) || isNaN(seconds) || isNaN(msTenths)) return NaN;
      return minutes * 60 + seconds + msTenths / 10;
    }
    const seconds = Number(trimmed);
    return isNaN(seconds) ? NaN : seconds;
  }

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!selectedEvent) return;

    const parsedBodyweight = Number(bodyweight);
    // Clamp bodyweight between 40 and 250 kg
    if (isNaN(parsedBodyweight) || parsedBodyweight < 40 || parsedBodyweight > 250) {
      setError('Enter a valid bodyweight between 40 and 250 kg.');
      return;
    }

    const parsedReps = Number(reps || '1');
    // Clamp reps between 1 and 10 when required
    if (requiresReps && (isNaN(parsedReps) || parsedReps < 1 || parsedReps > 10)) {
      setError('Enter valid reps between 1 and 10.');
      return;
    }

    // Parse value according to input type
    let numericValue: number | string = value;
    if (selectedEvent.inputType !== 'TIME') {
      const n = Number(value);
      if (isNaN(n) || n <= 0) {
        setError('Enter a valid numeric value.');
        return;
      }
      numericValue = n;
    } else {
      const seconds = parseTimeToSeconds(value);
      if (isNaN(seconds) || seconds <= 0) {
        setError('Enter time as mm:ss or seconds (e.g., 1:35 or 95).');
        return;
      }
      numericValue = seconds;
    }

    // Convert age to an approximate date of birth (for scoring util which expects DOB)
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setError('Enter a valid age between 18 and 100.');
      return;
    }
    const today = new Date();
    const dobDate = new Date(today.getFullYear() - ageNum, today.getMonth(), today.getDate());

    try {
      setLoading(true);
      const res = await calculateScore(
        selectedEvent.scoringSystemId,
        numericValue as number,
        parsedBodyweight || 0,
        dobDate,
        sex,
        parsedReps,
      );
      setResult({ score: Math.round(res.score), system: res.scoringSystem.name });
    } catch (_err) {
      setError('Failed to calculate score.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute requireAuth requireAdmin>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <WelcomeSection />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <h3 className="text-sm font-semibold text-white mb-1">How it works</h3>
              <p className="text-xs text-gray-300">
                Enter competitor details and event input to see the computed score. Nothing is
                saved.
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <h3 className="text-sm font-semibold text-white mb-1">Input tips</h3>
              <p className="text-xs text-gray-300">
                Rowing/Bike times accept mm:ss (e.g., 1:35) or seconds (e.g., 95).
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <h3 className="text-sm font-semibold text-white mb-1">Constraints</h3>
              <p className="text-xs text-gray-300">
                Age 18–100, bodyweight 40–250kg, reps 1–10 (for lifts).
              </p>
            </div>
          </div>

          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Competitor name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-sans">
                  Sex
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSex('M')}
                    className={`px-3 py-2 rounded-md text-sm ${
                      sex === 'M'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('F')}
                    className={`px-3 py-2 rounded-md text-sm ${
                      sex === 'F'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>

              <Input
                label="Bodyweight (kg)"
                type="number"
                min="40"
                max="250"
                step="0.1"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                helperText="40–250kg"
              />

              <Input
                label="Age"
                type="number"
                min="18"
                max="100"
                step="1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                helperText="Enter an age between 18 and 100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-sans">
                  Event Type
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {EVENT_TYPES.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
                {selectedEvent && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              <Input
                label={valueLabel}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type={selectedEvent?.inputType === 'TIME' ? 'text' : 'number'}
                placeholder={
                  selectedEvent?.inputType === 'TIME' ? 'e.g. 1:26.3, 1.26.3 or 86.3' : ''
                }
              />

              {requiresReps && (
                <Input
                  label="Reps"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  helperText="1–10 reps"
                />
              )}
            </div>

            {error && <div className="text-accent-600 dark:text-accent-400 text-sm">{error}</div>}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={loading}>
                Calculate Score
              </Button>
              {result && (
                <div className="text-sm text-gray-900 dark:text-white">
                  Score for <span className="font-semibold">{result.system}</span>:
                  <span className="ml-2 text-primary-600 dark:text-primary-400 font-bold text-lg">
                    {result.score}
                  </span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
