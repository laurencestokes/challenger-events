import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const body = await request.json()
        const { eventCode } = body

        if (!eventCode) {
            return NextResponse.json({ error: 'Event code is required' }, { status: 400 })
        }

        // Find event by code
        const event = await prisma.event.findUnique({
            where: { code: eventCode.toUpperCase() },
            include: {
                activities: true
            }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (event.status === 'COMPLETED') {
            return NextResponse.json({ error: 'Event has already ended' }, { status: 400 })
        }

        // Check if user is already participating
        const existingScore = await prisma.score.findFirst({
            where: {
                userId: user.id,
                eventId: event.id
            }
        })

        if (existingScore) {
            return NextResponse.json({ error: 'Already participating in this event' }, { status: 400 })
        }

        // Create initial scores for all activities (with 0 values)
        const initialScores = event.activities.map(activity => ({
            userId: user.id,
            eventId: event.id,
            activityId: activity.id,
            value: 0
        }))

        await prisma.score.createMany({
            data: initialScores
        })

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