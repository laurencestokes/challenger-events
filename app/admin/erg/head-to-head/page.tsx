'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import Button from '@/components/ui/Button';
import { HeadToHeadSession } from '@/hooks/useErgSocket';

interface User {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: Date | string;
  sex?: 'M' | 'F';
}

export default function HeadToHeadSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [competitor1Id, setCompetitor1Id] = useState('');
  const [competitor2Id, setCompetitor2Id] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      if (!user) {
        console.log('No user available yet, skipping fetch');
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${user.uid || user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchUsers();
    }
  }, [user, authLoading, fetchUsers]);

  const calculateAge = (dateOfBirth: Date | string | { seconds: number }): number => {
    let dob: Date;

    // Handle Firestore Timestamp format
    if (dateOfBirth && typeof dateOfBirth === 'object' && 'seconds' in dateOfBirth) {
      // Firestore Timestamp: convert seconds to milliseconds
      dob = new Date(dateOfBirth.seconds * 1000);
    } else if (dateOfBirth) {
      // Regular date string or Date object
      dob = new Date(dateOfBirth);
    } else {
      return 0;
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const createSession = async () => {
    if (!competitor1Id || !competitor2Id) {
      setError('Please select both competitors');
      return;
    }

    if (competitor1Id === competitor2Id) {
      setError('Please select different competitors');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const comp1 = users.find((u) => u.id === competitor1Id);
      const comp2 = users.find((u) => u.id === competitor2Id);

      if (!comp1 || !comp2) {
        throw new Error('Competitors not found');
      }

      // Validate required data
      if (!comp1.bodyweight || !comp1.dateOfBirth || !comp1.sex) {
        throw new Error(`${comp1.name} is missing required profile data (weight, age, sex)`);
      }
      if (!comp2.bodyweight || !comp2.dateOfBirth || !comp2.sex) {
        throw new Error(`${comp2.name} is missing required profile data (weight, age, sex)`);
      }

      const sessionData: Omit<HeadToHeadSession, 'id'> = {
        competitor1: {
          id: comp1.id,
          name: comp1.name,
          age: calculateAge(comp1.dateOfBirth),
          sex: comp1.sex === 'M' ? 'male' : 'female',
          weight: comp1.bodyweight,
        },
        competitor2: {
          id: comp2.id,
          name: comp2.name,
          age: calculateAge(comp2.dateOfBirth),
          sex: comp2.sex === 'M' ? 'male' : 'female',
          weight: comp2.bodyweight,
        },
      };

      const response = await fetch('/api/erg/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const { session } = await response.json();

      // Redirect to the control page for this session
      router.push(`/admin/erg/head-to-head/${session.id}/control`);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div
                className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
                style={{ borderColor: '#4682B4' }}
              ></div>
              <p className="text-white text-lg">Loading...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link
                    href="/dashboard"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <span className="text-gray-900 dark:text-white text-sm font-medium">
                    Erg Live
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">
                  Create Head-to-Head Erg Competition
                </h1>
                <p className="mt-2 text-gray-400">
                  Set up live erg competitions between competitors
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Competitor 1</label>
                <select
                  value={competitor1Id}
                  onChange={(e) => setCompetitor1Id(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Competitor 1</option>
                  {users.map((user) => {
                    const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
                    const hasCompleteData = user.bodyweight && user.dateOfBirth && user.sex;

                    return (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                        {hasCompleteData
                          ? ` - ${age}y, ${user.sex}, ${user.bodyweight}kg`
                          : ' - Missing profile data'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Competitor 2</label>
                <select
                  value={competitor2Id}
                  onChange={(e) => setCompetitor2Id(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Competitor 2</option>
                  {users.map((user) => {
                    const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
                    const hasCompleteData = user.bodyweight && user.dateOfBirth && user.sex;

                    return (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                        {hasCompleteData
                          ? ` - ${age}y, ${user.sex}, ${user.bodyweight}kg`
                          : ' - Missing profile data'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={createSession}
                  disabled={creating || !competitor1Id || !competitor2Id}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {creating ? 'Creating Session...' : 'Create Session & Start'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/admin')}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </Button>
              </div>

              <div className="mt-6 p-6 bg-gray-700/50 rounded-lg border border-gray-600/50">
                <h3 className="font-semibold text-white mb-3">How it works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  <li>Select two competitors from the dropdown above</li>
                  <li>Click "Create Session & Start" to generate a unique session</li>
                  <li>You'll be taken to the control page where you can start the competition</li>
                  <li>A public display URL will be generated for spectators to view</li>
                  <li>
                    The Python script will receive competitor data and start streaming erg metrics
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
