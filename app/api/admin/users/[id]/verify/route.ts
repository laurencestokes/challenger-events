import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getUser, updateUser, isAdmin, serverTimestamp } from '@/lib/firestore';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];

    // Try to get admin by UID first, then by document ID
    let admin = await getUserByUid(userId);
    if (!admin) {
      admin = await getUser(userId);
    }

    if (!admin || !isAdmin(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { verificationStatus, verificationNotes } = body;

    if (
      !verificationStatus ||
      !['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVERIFICATION'].includes(verificationStatus)
    ) {
      return NextResponse.json({ error: 'Invalid verification status' }, { status: 400 });
    }

    // Get the user to be verified
    const userToVerify = await getUser(params.id);

    if (!userToVerify) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the user's verification status

    // Filter out undefined values to avoid Firestore errors
    const updateData: Record<string, unknown> = {
      verificationStatus,
      verifiedBy: admin.id,
      verifiedAt: serverTimestamp(),
    };

    // Only include verificationNotes if it's not empty
    if (verificationNotes && verificationNotes.trim() !== '') {
      updateData.verificationNotes = verificationNotes;
    }

    await updateUser(params.id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating verification status:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
