'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Create Head-to-Head Erg Competition</h1>

      <Card>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Competitor 1</label>
            <select
              value={competitor1Id}
              onChange={(e) => setCompetitor1Id(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium mb-2">Competitor 2</label>
            <select
              value={competitor2Id}
              onChange={(e) => setCompetitor2Id(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={createSession} disabled={creating || !competitor1Id || !competitor2Id}>
              {creating ? 'Creating Session...' : 'Create Session & Start'}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/admin')}>
              Cancel
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
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
      </Card>
    </div>
  );
}
