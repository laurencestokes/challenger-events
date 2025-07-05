import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import {
    getEventByCode,
    getUserByEmail,
    getActivitiesByEvent,
    createScore,
    getScoresByUserAndEvent
} from '@/lib/firestore'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await getUserByEmail(session.user.email)

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const body = await request.json()
        const { eventCode } = body

        if (!eventCode) {
            return NextResponse.json({ error: 'Event code is required' }, { status: 400 })
        }

        // Find event by code
        const event = await getEventByCode(eventCode.toUpperCase())

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.status === 'COMPLETED') {
            return NextResponse.json({ error: 'Event has already ended' }, { status: 400 })
        }

        // Get activities for the event
        const activities = await getActivitiesByEvent(event.id)

        if (activities.length === 0) {
            return NextResponse.json({ error: 'Event has no activities' }, { status: 400 })
        }

        // Check if user is already participating
        const existingScores = await getScoresByUserAndEvent(user.id, event.id)

        if (existingScores.length > 0) {
            return NextResponse.json({ error: 'Already participating in this event' }, { status: 400 })
        }

        // Create initial scores for all activities (with 0 values)
        const initialScores = activities.map(activity => ({
            userId: user.id,
            eventId: event.id,
            activityId: activity.id,
            value: 0
        }))

        // Create all scores in batch
        for (const scoreData of initialScores) {
            await createScore(scoreData)
        }

        return NextResponse.json({
            message: 'Successfully joined event',
            event: {
                id: event.id,
                name: event.name,
                code: event.code,
                status: event.status
            }
        })
    } catch (error) {
        console.error('Error joining event:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 