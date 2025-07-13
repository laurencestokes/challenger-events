'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api-client';
import { convertFirestoreTimestamp, calculateAgeFromDateOfBirth } from '../../lib/utils';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPETITOR';
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
  verifiedAt?: unknown;
  createdAt: unknown;
}

// Zod schema for validation
const today = new Date();
const minBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bodyweight: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 40 && num <= 250;
  }, 'Bodyweight must be between 40kg and 250kg'),
  dateOfBirth: z
    .string()
    .transform((val) => {
      // Extract just the date part if it's a full ISO string
      if (val && val.includes('T')) {
        return val.split('T')[0];
      }
      return val;
    })
    .refine((val) => {
      if (!val) return false;
      const date = new Date(val);
      return date >= minBirthDate && date <= maxBirthDate;
    }, 'Age must be between 18 and 100 years'),
  sex: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.enum(['M', 'F'], { required_error: 'Sex is required' }),
  ),
});

type ProfileFormType = z.infer<typeof ProfileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormType>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: '',
      bodyweight: '',
      dateOfBirth: '',
      sex: undefined,
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await api.get('/api/user/profile');
        setProfile(profileData);
      } catch (error: unknown) {
        console.error('Error fetching profile:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  // When profile loads, reset form values
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        bodyweight: profile.bodyweight?.toString() || '',
        dateOfBirth: profile.dateOfBirth
          ? convertFirestoreTimestamp(profile.dateOfBirth)?.toISOString().split('T')[0] || ''
          : '',
        sex: profile.sex as 'M' | 'F' | undefined,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormType) => {
    setIsLoading(true);
    setError('');
    try {
      // Handle date transformation manually
      let processedDateOfBirth = data.dateOfBirth;
      if (data.dateOfBirth && data.dateOfBirth.includes('T')) {
        processedDateOfBirth = data.dateOfBirth.split('T')[0];
      }

      const updatedProfile = await api.put('/api/user/profile', {
        name: data.name,
        bodyweight: Number(data.bodyweight),
        dateOfBirth: processedDateOfBirth || undefined,
        sex: data.sex,
      });
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (date: unknown) => {
    const dateObj = convertFirestoreTimestamp(date);
    return dateObj ? dateObj.toLocaleDateString() : 'Not set';
  };

  const calculateAge = (dateOfBirth: unknown) => {
    const birthDate = convertFirestoreTimestamp(dateOfBirth);
    if (!birthDate) return 'Not set';
    return calculateAgeFromDateOfBirth(birthDate);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading profile...</p>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your profile information and verification status
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Profile Information
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {isEditing ? (
                    <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </label>
                        <input
                          type="text"
                          {...register('name')}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                        />
                        {errors.name && (
                          <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Bodyweight (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('bodyweight')}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                        />
                        {errors.bodyweight && (
                          <p className="text-xs text-red-600 mt-1">{errors.bodyweight.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          {...register('dateOfBirth')}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                        />
                        {errors.dateOfBirth && (
                          <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Sex
                        </label>
                        <select
                          {...register('sex')}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                        >
                          <option value="">Select...</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                        </select>
                        {errors.sex && (
                          <p className="text-xs text-red-600 mt-1">{errors.sex.message}</p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
                        >
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {profile?.name}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {profile?.email}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Bodyweight:
                        </span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {profile?.bodyweight ? `${profile.bodyweight} kg` : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Age:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {profile?.dateOfBirth
                            ? `${calculateAge(profile.dateOfBirth)} years`
                            : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Sex:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {profile?.sex || 'Not set'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Verification Status
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                      <div className="mt-1">
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getVerificationStatusColor(
                            profile?.verificationStatus || 'PENDING',
                          )}`}
                        >
                          {profile?.verificationStatus || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    {profile?.verificationNotes && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Notes:</span>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">
                          {profile.verificationNotes}
                        </div>
                      </div>
                    )}

                    {Boolean(profile?.verifiedAt) && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Verified on:
                        </span>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">
                          {formatDate(profile?.verifiedAt as Date)}
                        </div>
                      </div>
                    )}

                    {profile?.verificationStatus === 'PENDING' && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Your profile is pending verification. An admin will review your
                          information soon.
                        </p>
                      </div>
                    )}

                    {profile?.verificationStatus === 'REJECTED' && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          Your profile was rejected. Please update your information and contact an
                          admin.
                        </p>
                      </div>
                    )}

                    {profile?.verificationStatus === 'VERIFIED' && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          ✓ Your profile has been verified. Your scores can be submitted to events!
                        </p>
                      </div>
                    )}
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
