'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Header from 'components/Header';
import Footer from 'components/Footer';
import { calculateLiftScore, calculateRowingScoreNew } from 'utils/scoring';
import Link from 'next/link';
import { ChallengerData } from '@challengerco/challenger-data';

const athleteSchema = z.object({
  squat: z.number({ invalid_type_error: 'Please enter a valid number' }).min(0).max(500, 'Squat must be between 0 and 500 kg'),
  bench: z.number({ invalid_type_error: 'Please enter a valid number' }).min(0).max(350, 'Bench must be between 0 and 350 kg'),
  deadlift: z.number({ invalid_type_error: 'Please enter a valid number' }).min(0).max(500, 'Deadlift must be between 0 and 500 kg'),
  row500m: z.string().regex(/^(\d{1,2}:)?\d{1,2}$/, { message: 'Enter as mm:ss or ss' }),
  bodyweight: z.number({ invalid_type_error: 'Please enter a valid number' }).min(40).max(200, 'Body mass must be between 40 and 200 kg'),
  age: z.number({ invalid_type_error: 'Please enter a valid number' }).min(18).max(100, 'Age must be between 18 and 100 years'),
  sex: z.enum(['M', 'F']),
});

type AthleteForm = z.infer<typeof athleteSchema>;

type LiftResult = {
  score: number;
  benchmark: number;
  percentile: number;
  p95: number;
  max: number;
  p50: number;
};

type Results = {
  squat: LiftResult;
  bench: LiftResult;
  deadlift: LiftResult;
  row500m: {
    score: number;
    percentile: number;
    watts: number;
  };
};

function parseTimeToSeconds(time: string): number {
  if (time.includes(':')) {
    const [min, sec] = time.split(':').map(Number);
    return min * 60 + sec;
  }
  return Number(time);
}


export default function FormulaPage() {
  const [result, setResult] = useState<Results | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AthleteForm>({
    resolver: zodResolver(athleteSchema),
  });

  const onSubmit = (data: AthleteForm) => {
    const results = {
      squat: calculateLiftScore('squat', data.squat, data.bodyweight, data.age, data.sex),
      bench: calculateLiftScore('bench', data.bench, data.bodyweight, data.age, data.sex),
      deadlift: calculateLiftScore('deadlift', data.deadlift, data.bodyweight, data.age, data.sex),
      row500m: (() => {
        const seconds = parseTimeToSeconds(data.row500m);
        const watts = ChallengerData.paceToWatts(seconds);
        const sex = data.sex === 'M' ? 'male' : 'female';
        const rowResult = calculateRowingScoreNew(watts, sex, data.age, data.bodyweight);
        return {
          score: rowResult.score,
          percentile: rowResult.percentile,
          watts,
        };
      })(),
    };
    setResult(results);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
              The Most Accurate Scoring System in Fitness.
            </h1>
            <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-8">
              Challenge anyone — no matter your size, age, or gender.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We take your raw performance and translate it into Challenger Points using verified data and cutting-edge statistical modelling.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
              How It Works
            </h2>
            <div className="space-y-6 text-lg text-gray-600 dark:text-gray-300">
              <p>
                We&apos;ve re-engineered fairness. A scoring system that removes the need for categories.
              </p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl mb-2">❌</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">No Weight Classes</h3>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl mb-2">❌</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">No Gender Splits</h3>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl mb-2">❌</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">No Age Brackets</h3>
                </div>
              </div>
              <p>
                Using real-world data and statistical modelling, we normalise your performance — so your score reflects the work you did, not who you are.
              </p>
              <p>
                Whether you squat 60kg at 20 years old or 40, the system accounts for the differences. What you get is a single score — based on output — that lets you compare, compete, and track progress fairly.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                Try It Yourself
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                Enter your best performance below and see how many Challenger Points you&apos;d score.
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                No labels. No limits.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Calculator Form */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                  Calculate Your Challenger Score
                </h3>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Personal Information */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 italic">Personal Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Age</label>
                        <input
                          type="number"
                          {...register('age', { valueAsNumber: true })}
                          className={`w-full p-3 border rounded-lg ${errors.age ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                          placeholder="18-100"
                        />
                        {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Body Weight (kg)</label>
                        <input
                          type="number"
                          {...register('bodyweight', { valueAsNumber: true })}
                          className={`w-full p-3 border rounded-lg ${errors.bodyweight ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                          placeholder="40-200"
                        />
                        {errors.bodyweight && (
                          <p className="text-red-500 text-sm mt-1">{errors.bodyweight.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sex</label>
                        <select
                          {...register('sex')}
                          className={`w-full p-3 border rounded-lg ${errors.sex ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                        </select>
                        {errors.sex && <p className="text-red-500 text-sm mt-1">{errors.sex.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-300 dark:border-gray-600 my-6"></div>

                  {/* Test Performance */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 italic">Test Performance</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Squat (kg)</label>
                        <input
                          type="number"
                          {...register('squat', { valueAsNumber: true })}
                          className={`w-full p-3 border rounded-lg ${errors.squat ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                          placeholder="0-500"
                        />
                        {errors.squat && <p className="text-red-500 text-sm mt-1">{errors.squat.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Bench Press (kg)</label>
                        <input
                          type="number"
                          {...register('bench', { valueAsNumber: true })}
                          className={`w-full p-3 border rounded-lg ${errors.bench ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                          placeholder="0-350"
                        />
                        {errors.bench && <p className="text-red-500 text-sm mt-1">{errors.bench.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Deadlift (kg)</label>
                        <input
                          type="number"
                          {...register('deadlift', { valueAsNumber: true })}
                          className={`w-full p-3 border rounded-lg ${errors.deadlift ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                          placeholder="0-500"
                        />
                        {errors.deadlift && (
                          <p className="text-red-500 text-sm mt-1">{errors.deadlift.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">500m Row (mm:ss or seconds)</label>
                        <input
                          type="text"
                          {...register('row500m')}
                          className={`w-full p-3 border rounded-lg ${errors.row500m ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                          placeholder="e.g. 1:35 or 95"
                        />
                        {errors.row500m && <p className="text-red-500 text-sm mt-1">{errors.row500m.message}</p>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Calculate My Score
                  </button>
                </form>
              </div>

              {/* Results Display */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                  Your Results
                </h3>

                {result ? (
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg">
                      <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                        {Math.round((result.squat.score + result.bench.score + result.deadlift.score) / 3)}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        Challenger Points
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Squat Score:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{result.squat.score}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Bench Score:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{result.bench.score}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Deadlift Score:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{result.deadlift.score}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">500m Row Score:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{result.row500m.score}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <Link
                        href="/about"
                        className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                      >
                        Learn More About The Score →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Enter your performance data to see your Challenger Score
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
