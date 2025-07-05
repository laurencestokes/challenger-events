'use client';

import { useState } from 'react';
import Header from 'components/Header';
import Footer from 'components/Footer';
import { calculateLiftScore } from 'utils/scoring';

interface Competitor {
  id: string;
  name: string;
  sex: 'M' | 'F';
  age: number;
  bodyweight: number;
  squat: number;
  bench: number;
  deadlift: number;
  scores: {
    squat: number;
    bench: number;
    deadlift: number;
  };
  totalScore: number;
}

function generateRandomName(): string {
  const firstNames = [
    'Alex',
    'Jordan',
    'Taylor',
    'Morgan',
    'Sam',
    'Casey',
    'Riley',
    'Jamie',
    'Quinn',
    'Drew',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
  ];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateCompetitor(): Competitor {
  const sex = Math.random() > 0.5 ? 'M' : 'F';
  const age = Math.floor(Math.random() * 45) + 16; // 16-60 years old
  const bodyweight =
    sex === 'M'
      ? Math.floor(Math.random() * 60) + 60 // 60-120kg for men
      : Math.floor(Math.random() * 40) + 40; // 40-80kg for women

  // Generate lifts with some randomness but keeping them somewhat realistic
  const squat =
    sex === 'M'
      ? Math.floor(Math.random() * 200) + 100 // 100-300kg for men
      : Math.floor(Math.random() * 120) + 60; // 60-180kg for women

  const bench =
    sex === 'M'
      ? Math.floor(Math.random() * 150) + 80 // 80-230kg for men
      : Math.floor(Math.random() * 80) + 40; // 40-120kg for women

  const deadlift =
    sex === 'M'
      ? Math.floor(Math.random() * 200) + 100 // 100-300kg for men
      : Math.floor(Math.random() * 120) + 60; // 60-180kg for women

  const squatScore = calculateLiftScore('squat', squat, bodyweight, age, sex);
  const benchScore = calculateLiftScore('bench', bench, bodyweight, age, sex);
  const deadliftScore = calculateLiftScore('deadlift', deadlift, bodyweight, age, sex);

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: generateRandomName(),
    sex,
    age,
    bodyweight,
    squat,
    bench,
    deadlift,
    scores: {
      squat: squatScore.score,
      bench: benchScore.score,
      deadlift: deadliftScore.score,
    },
    totalScore: squatScore.score + benchScore.score + deadliftScore.score,
  };
}

export default function MockPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [sortBy, setSortBy] = useState<'total' | 'squat' | 'bench' | 'deadlift'>('total');

  const generateCompetition = () => {
    const newCompetitors = Array.from({ length: 20 }, generateCompetitor);
    setCompetitors(newCompetitors);
  };

  const sortedCompetitors = [...competitors].sort((a, b) => {
    if (sortBy === 'total') return b.totalScore - a.totalScore;
    return b.scores[sortBy] - a.scores[sortBy];
  });

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Mock Competition Generator</h1>

        <div className="mb-8">
          <button
            onClick={generateCompetition}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate New Competition
          </button>
        </div>

        {competitors.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'total' | 'squat' | 'bench' | 'deadlift')
                }
                className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="total">Total Score</option>
                <option value="squat">Squat Score</option>
                <option value="bench">Bench Score</option>
                <option value="deadlift">Deadlift Score</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-right">Squat</th>
                    <th className="p-3 text-right">Bench</th>
                    <th className="p-3 text-right">Deadlift</th>
                    <th className="p-3 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompetitors.map((competitor, index) => (
                    <tr key={competitor.id} className="border-b dark:border-gray-700">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{competitor.name}</td>
                      <td className="p-3">
                        {competitor.sex === 'M' ? 'Male' : 'Female'} • {competitor.age}y •{' '}
                        {competitor.bodyweight}kg
                      </td>
                      <td className="p-3 text-right">
                        {competitor.squat}kg ({competitor.scores.squat})
                      </td>
                      <td className="p-3 text-right">
                        {competitor.bench}kg ({competitor.scores.bench})
                      </td>
                      <td className="p-3 text-right">
                        {competitor.deadlift}kg ({competitor.scores.deadlift})
                      </td>
                      <td className="p-3 text-right font-bold">{competitor.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mt-8">
              <h2 className="text-xl font-semibold mb-4">Analysis Notes</h2>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  • This mock competition generates 20 competitors with varying characteristics to
                  help identify potential scoring anomalies
                </p>
                <p>
                  • Competitors are generated with realistic but diverse age (16-60), bodyweight,
                  and lift combinations
                </p>
                <p>• Pay attention to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Score distribution across different age groups</li>
                  <li>Weight class effects on scoring</li>
                  <li>Potential outliers or unexpected score patterns</li>
                  <li>Balance between different lifts (squat vs bench vs deadlift)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
