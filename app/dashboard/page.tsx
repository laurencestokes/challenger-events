'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminDashboard from '@/components/AdminDashboard'
import CompetitorDashboard from '@/components/CompetitorDashboard'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    if (status === 'loading') {
        return <LoadingSpinner />
    }

    if (!session) {
        return null
    }

    const userRole = session.user?.role || 'COMPETITOR'

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' ? (
                        <AdminDashboard />
                    ) : (
                        <CompetitorDashboard />
                    )}
                </div>
            </div>
        </div>
    )
} 