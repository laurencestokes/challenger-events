'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { calculateAgeFromDateOfBirth, convertFirestoreTimestamp } from '@/lib/utils';

interface UserEvent {
  id: string;
  name: string;
  code: string;
  status: string;
  joinedAt: unknown;
  score?: number;
}

export default function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bodyweight: '',
    dateOfBirth: '',
    sex: '',
  });

  // Update form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bodyweight: user.bodyweight?.toString() || '',
        dateOfBirth: user.dateOfBirth
          ? (() => {
              const birthDate = convertFirestoreTimestamp(user.dateOfBirth);
              return birthDate ? birthDate.toISOString().split('T')[0] : '';
            })()
          : '',
        sex: user.sex || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchUserEvents = async () => {
      try {
        const eventsData = await api.get('/api/user/events');
        setUserEvents(eventsData);
      } catch (error: unknown) {
        console.error('Error fetching user events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user events';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserEvents();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Only include fields that have values or have been changed
      const updateData: Partial<{
        name: string;
        email: string;
        bodyweight: number | null;
        dateOfBirth: string | Date | null;
        sex: string | null;
      }> = {};

      // Always include name if it's not empty (allow clearing by sending empty string)
      if (formData.name !== undefined) {
        updateData.name = formData.name.trim();
      }

      // Include bodyweight if it has a value, or if it's empty (to clear it)
      if (formData.bodyweight !== undefined) {
        if (formData.bodyweight.trim()) {
          updateData.bodyweight = Number(formData.bodyweight);
        } else {
          updateData.bodyweight = null; // Clear the field
        }
      }

      // Include dateOfBirth if it has a value, or if it's empty (to clear it)
      if (formData.dateOfBirth !== undefined) {
        if (formData.dateOfBirth.trim()) {
          updateData.dateOfBirth = new Date(formData.dateOfBirth);
        } else {
          updateData.dateOfBirth = null; // Clear the field
        }
      }

      // Include sex if it has a value, or if it's empty (to clear it)
      if (formData.sex !== undefined) {
        updateData.sex = formData.sex || null;
      }

      await api.put('/api/user/profile', updateData);
      setIsEditing(false);
      // Refresh user data
      window.location.reload();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: unknown) => {
    if (!dateString) return 'Not set';

    let date: Date;

    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        date = new Date((dateString as { seconds: number }).seconds * 1000);
      } else if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        date = (dateString as { toDate: () => Date }).toDate();
      } else {
        return 'Invalid date';
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      return 'Invalid date';
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'ADMIN':
        return 'Administrator';
      case 'COMPETITOR':
        return 'Competitor';
      case 'VIEWER':
        return 'Viewer';
      default:
        return role;
    }
  };

  if (!user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex flex-col">
        <Header />
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your account and view your event history
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Account Information */}
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Account Information
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          placeholder="Enter your email address"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Email cannot be changed
                        </p>
                      </div>

                      {/* Competitor Stats */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Competitor Stats
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          These details help calculate accurate scores for workouts that require
                          age, sex, and bodyweight adjustments.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label
                              htmlFor="bodyweight"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
                              Bodyweight (kg)
                            </label>
                            <input
                              type="number"
                              id="bodyweight"
                              name="bodyweight"
                              value={formData.bodyweight}
                              onChange={handleInputChange}
                              min="0"
                              step="0.1"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"
                              placeholder="e.g., 75.5"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="dateOfBirth"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              id="dateOfBirth"
                              name="dateOfBirth"
                              value={formData.dateOfBirth}
                              onChange={handleInputChange}
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="sex"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
                              Sex
                            </label>
                            <select
                              id="sex"
                              name="sex"
                              value={formData.sex}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-800"
                            >
                              <option value="">Select...</option>
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Full Name
                        </h3>
                        <p className="text-gray-900 dark:text-white">{user.name || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Email Address
                        </h3>
                        <p className="text-gray-900 dark:text-white">{user.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Role
                        </h3>
                        <p className="text-gray-900 dark:text-white">
                          {getRoleDisplayName(user.role)}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          User ID
                        </h3>
                        <p className="text-gray-900 dark:text-white font-mono text-sm">{user.id}</p>
                      </div>

                      {/* Competitor Stats Display */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Competitor Stats
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Bodyweight
                            </span>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {user.bodyweight ? `${user.bodyweight}kg` : '--'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Age</span>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {user.dateOfBirth
                                ? (() => {
                                    const birthDate = convertFirestoreTimestamp(user.dateOfBirth);
                                    return birthDate
                                      ? calculateAgeFromDateOfBirth(birthDate)
                                      : '--';
                                  })()
                                : '--'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Sex</span>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {user.sex === 'M' ? 'Male' : user.sex === 'F' ? 'Female' : '--'}
                            </p>
                          </div>
                        </div>
                        {(!user.bodyweight || !user.dateOfBirth || !user.sex) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 Click "Edit" above to add your competitor stats for more accurate
                            scoring
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Event History */}
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Event History
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {userEvents.length} events
                    </span>
                  </div>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">Loading events...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-error-600 dark:text-error-400">{error}</p>
                    </div>
                  ) : userEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No events joined yet.</p>
                      <Link
                        href="/dashboard"
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                      >
                        Browse Events
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {event.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Code: {event.code} • Joined: {formatDate(event.joinedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            {event.score !== undefined && (
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Score: {event.score}
                              </p>
                            )}
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                event.status === 'ACTIVE'
                                  ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                                  : event.status === 'COMPLETED'
                                    ? 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200'
                                    : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200'
                              }`}
                            >
                              {event.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Quick Actions
                  </h2>
                  <div className="space-y-3">
                    <Link
                      href="/dashboard"
                      className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                    >
                      Go to Dashboard
                    </Link>
                    <Link
                      href="/dashboard"
                      className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Browse Events
                    </Link>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Account Stats
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Events Joined
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userEvents.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getRoleDisplayName(user.role)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Member Since</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Competitor Stats Summary */}
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Competitor Stats
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Bodyweight</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.bodyweight ? `${user.bodyweight}kg` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Age</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.dateOfBirth
                          ? (() => {
                              const birthDate = convertFirestoreTimestamp(user.dateOfBirth);
                              return birthDate ? calculateAgeFromDateOfBirth(birthDate) : '--';
                            })()
                          : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Sex</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.sex === 'M' ? 'Male' : user.sex === 'F' ? 'Female' : '--'}
                      </span>
                    </div>
                  </div>
                  {(!user.bodyweight || !user.dateOfBirth || !user.sex) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                      💡 Add your stats for better scoring
                    </p>
                  )}
                </div>

                {/* Account Security */}
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Account Security
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Email Verified
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          firebaseUser?.emailVerified
                            ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                            : 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200'
                        }`}
                      >
                        {firebaseUser?.emailVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        /* TODO: Implement password change */
                      }}
                      className="block w-full text-left py-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
