import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { generateEventCode } from '@/lib/utils'
import { isAdmin } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { name, description, startDate, endDate } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Generate unique event code
        let code: string
        let isUnique = false
        while (!isUnique) {
            code = generateEventCode()
            const existingEvent = await prisma.event.findUnique({
                where: { code }
            })
            if (!existingEvent) {
                isUnique = true
            }
        }

        const event = await prisma.event.create({
            data: {
                name,
                description,
                code: code!,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                admins: {
                    connect: { id: user.id }
                }
            },
            include: {
                admins: true
            }
        })

        return NextResponse.json(event)
    } catch (error) {
        console.error('Error creating event:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
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

        let events
        if (isAdmin(user.role)) {
            // Admins see all events they have access to
            events = await prisma.event.findMany({
                where: {
                    admins: {
                        some: {
                            id: user.id
                        }
                    }
                },
                include: {
                    admins: true,
                    _count: {
                        select: {
                            scores: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
        } else {
            // Competitors see events they're participating in
            events = await prisma.event.findMany({
                where: {
                    scores: {
                        some: {
                            userId: user.id
                        }
                    }
                },
                include: {
                    _count: {
                        select: {
                            scores: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
        }

        return NextResponse.json(events)
    } catch (error) {
        console.error('Error fetching events:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 