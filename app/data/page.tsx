'use client';

import { useState } from 'react';
import Header from 'components/Header';
import Footer from 'components/Footer';
import { LIFTING_STANDARDS } from 'constants/liftingStandards';

type Sex = 'M' | 'F';
type AgeGroup = 'Junior' | 'Open' | 'Masters1' | 'Masters2' | 'Masters3';
type LiftType = 'squat' | 'bench' | 'deadlift';

interface LiftStats {
  max: number;
  p95: number;
  p90: number;
  p75: number;
  p50: number;
  count: number;
}

interface LiftTypeStats {
  [key: string]: LiftStats;
}

interface AgeGroupStats {
  [key: string]: LiftTypeStats;
}

interface GroupStats {
  [key: string]: AgeGroupStats;
}

interface SexGroups {
  [key: string]: GroupStats;
}

interface LiftingStandards {
  groups: SexGroups;
}

export default function DataPage() {
  const [selectedSex, setSelectedSex] = useState<Sex>('M');
  const [selectedWeightClass, setSelectedWeightClass] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
  const [selectedLift, setSelectedLift] = useState<LiftType | 'all'>('all');

  // Get all unique weight classes for the selected sex and sort them
  const weightClasses = Object.keys(LIFTING_STANDARDS.groups[selectedSex]).sort((a, b) => {
    // Extract numeric values from weight classes
    const aNum = parseInt(a.replace(/[^\d]/g, ''));
    const bNum = parseInt(b.replace(/[^\d]/g, ''));

    // Handle the '+' case (e.g., '84+kg' should come after '84kg')
    if (a.includes('+') && !b.includes('+')) return 1;
    if (!a.includes('+') && b.includes('+')) return -1;

    return aNum - bNum;
  });

  // Helper function to format numbers nicely
  const formatNumber = (num: number) => num.toFixed(1);

  // Filter and transform data based on selections
  const getFilteredData = () => {
    const data = (LIFTING_STANDARDS as LiftingStandards).groups[selectedSex];
    const filteredData: GroupStats = {};

    // Get sorted weight classes
    const sortedWeightClasses = Object.keys(data).sort((a, b) => {
      const aNum = parseInt(a.replace(/[^\d]/g, ''));
      const bNum = parseInt(b.replace(/[^\d]/g, ''));

      if (a.includes('+') && !b.includes('+')) return 1;
      if (!a.includes('+') && b.includes('+')) return -1;

      return aNum - bNum;
    });

    sortedWeightClasses.forEach((weightClass) => {
      if (selectedWeightClass === 'all' || selectedWeightClass === weightClass) {
        const ageGroups = data[weightClass];
        filteredData[weightClass] = {};
        Object.entries(ageGroups).forEach(([ageGroup, lifts]) => {
          if (selectedAgeGroup === 'all' || selectedAgeGroup === ageGroup) {
            filteredData[weightClass][ageGroup] = {};
            Object.entries(lifts).forEach(([lift, stats]) => {
              if (selectedLift === 'all' || selectedLift === lift) {
                filteredData[weightClass][ageGroup][lift] = stats;
              }
            });
            if (Object.keys(filteredData[weightClass][ageGroup]).length === 0) {
              delete filteredData[weightClass][ageGroup];
            }
          }
        });
        if (Object.keys(filteredData[weightClass]).length === 0) {
          delete filteredData[weightClass];
        }
      }
    });

    return filteredData;
  };

  const filteredData = getFilteredData();

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Lifting Standards Data</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Sex</label>
            <select
              value={selectedSex}
              onChange={(e) => setSelectedSex(e.target.value as Sex)}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Weight Class</label>
            <select
              value={selectedWeightClass}
              onChange={(e) => setSelectedWeightClass(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Weight Classes</option>
              {weightClasses.map((wc) => (
                <option key={wc} value={wc}>
                  {wc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Age Group</label>
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value as AgeGroup | 'all')}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Age Groups</option>
              <option value="Junior">Junior</option>
              <option value="Open">Open</option>
              <option value="Masters1">Masters 1</option>
              <option value="Masters2">Masters 2</option>
              <option value="Masters3">Masters 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lift Type</label>
            <select
              value={selectedLift}
              onChange={(e) => setSelectedLift(e.target.value as LiftType | 'all')}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Lifts</option>
              <option value="squat">Squat</option>
              <option value="bench">Bench</option>
              <option value="deadlift">Deadlift</option>
            </select>
          </div>
        </div>

        {/* Data Source Information */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Source Information</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>
              • Source: OpenIPF (International Powerlifting Federation) competition data from{' '}
              <a
                href="https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                OpenPowerlifting
              </a>
            </p>
            <p>• Time Period: 2015 onwards</p>
            <p>• Equipment: Raw/Classic lifts only (no equipped lifts)</p>
            <p>• Competition Type: Official IPF sanctioned meets</p>
            <p>
              • Data Processing: Percentiles calculated for each sex, weight class, and age group
              combination with minimum 10 lifters
            </p>
          </div>
        </div>

        {/* Data Display */}
        <div className="space-y-8">
          {Object.entries(filteredData).map(([weightClass, ageGroups]) => (
            <div key={weightClass} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">{weightClass}</h2>
              <div className="space-y-6">
                {Object.entries(ageGroups as AgeGroupStats).map(([ageGroup, lifts]) => (
                  <div key={ageGroup}>
                    <h3 className="text-xl font-semibold mb-3">{ageGroup}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(lifts as LiftTypeStats).map(
                        ([lift, stats]: [string, LiftStats]) => (
                          <div key={lift} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="text-lg font-medium mb-2 capitalize">{lift}</h4>
                            <div className="space-y-1 text-sm">
                              <p>Max: {formatNumber(stats.max)}kg</p>
                              <p>95th: {formatNumber(stats.p95)}kg</p>
                              <p>90th: {formatNumber(stats.p90)}kg</p>
                              <p>75th: {formatNumber(stats.p75)}kg</p>
                              <p>50th: {formatNumber(stats.p50)}kg</p>
                              <p className="text-gray-500 dark:text-gray-400">
                                Sample size: {stats.count}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
