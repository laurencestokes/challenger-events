'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

interface User {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
    teams: Array<{
        team: {
            id: string
            name: string
        }
    }>
}

export default function Profile() {
    const { data: session } = useSession()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/user')
                if (response.ok) {
                    const userData = await response.json()
                    setUser(userData)
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (session) {
            fetchUser()
        }
    }, [session])

    if (!session) {
        return <LoadingSpinner />
    }

    if (isLoading) {
        return <LoadingSpinner />
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                    </div>

                    <div className="p-6">
                        {user && (
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                        Basic Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Name
                                            </label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                {user.name || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Email
                                            </label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Role
                                            </label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                {user.role.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Member Since
                                            </label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Teams */}
                                {user.teams.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Teams
                                        </h2>
                                        <div className="space-y-2">
                                            {user.teams.map((teamMember) => (
                                                <div
                                                    key={teamMember.team.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                >
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {teamMember.team.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Performance History */}
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                        Performance History
                                    </h2>
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 dark:text-gray-400">
                                            No performance data available yet.
                                        </p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                            Join events to start tracking your performance!
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => router.push('/dashboard')}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 