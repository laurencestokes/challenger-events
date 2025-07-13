import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  createCompetitionVerification,
  getCompetitionVerification,
  updateCompetitionVerification,
  getCompetitionVerificationsByEvent,
} from '@/lib/firestore';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all verifications for this event
    const verifications = await getCompetitionVerificationsByEvent(params.id);

    return NextResponse.json({ verifications });
  } catch (error) {
    console.error('Error fetching competition verifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const admin = await getUserByUid(userId);

    if (!admin || !isAdmin(admin.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { competitorId, bodyweight, verificationNotes } = body;

    if (!competitorId || !bodyweight) {
      return NextResponse.json(
        { error: 'Competitor ID and bodyweight are required' },
        { status: 400 },
      );
    }

    // Check if verification already exists
    const existingVerification = await getCompetitionVerification(competitorId, params.id);

    if (existingVerification) {
      // Update existing verification
      await updateCompetitionVerification(existingVerification.id, {
        bodyweight,
        verificationNotes,
        status: 'VERIFIED',
        verifiedBy: admin.id,
      });
    } else {
      // Create new verification
      await createCompetitionVerification({
        userId: competitorId,
        eventId: params.id,
        bodyweight,
        verificationNotes,
        status: 'VERIFIED',
        verifiedBy: admin.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating competition verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
