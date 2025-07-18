import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getTeam, getTeamMembers, deleteTeam } from '@/lib/firestore';
import { db } from '@/lib/firestore';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamId = params.id;
    const memberId = params.memberId;

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members
    const teamMembers = await getTeamMembers(teamId);
    const userMember = teamMembers.find((member) => member.userId === user.id);
    const memberToRemove = teamMembers.find((member) => member.id === memberId);

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user is trying to remove themselves or if they're a captain removing someone else
    const isRemovingSelf = memberToRemove.userId === user.id;
    const isCaptainRemovingOther = userMember?.role === 'CAPTAIN' && !isRemovingSelf;

    if (!isRemovingSelf && !isCaptainRemovingOther) {
      return NextResponse.json(
        { error: 'You can only remove yourself or be removed by a captain' },
        { status: 403 },
      );
    }

    // Prevent captain from removing themselves if they're the only captain AND there are other members
    if (isRemovingSelf && userMember?.role === 'CAPTAIN') {
      const captains = teamMembers.filter((member) => member.role === 'CAPTAIN');
      const nonCaptains = teamMembers.filter((member) => member.role !== 'CAPTAIN');

      if (captains.length === 1 && nonCaptains.length > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot leave team as the only captain. Promote another member to captain first.',
          },
          { status: 400 },
        );
      }
    }

    // Remove the member from the team
    const memberRef = doc(db, 'teamMembers', memberId);
    await deleteDoc(memberRef);

    // Check if this was the last member leaving the team
    const remainingMembers = teamMembers.filter((member) => member.id !== memberId);

    if (remainingMembers.length === 0) {
      // Delete the team since it has no members left
      await deleteTeam(teamId);
      return NextResponse.json({
        message: 'Member removed successfully. Team deleted as it had no remaining members.',
        teamDeleted: true,
      });
    }

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamId = params.id;
    const memberId = params.memberId;

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is the captain of the team
    const teamMembers = await getTeamMembers(teamId);
    const userMember = teamMembers.find((member) => member.userId === user.id);

    if (!userMember || userMember.role !== 'CAPTAIN') {
      return NextResponse.json(
        { error: 'Only team captains can promote members' },
        { status: 403 },
      );
    }

    // Check if the member to be promoted exists
    const memberToPromote = teamMembers.find((member) => member.id === memberId);
    if (!memberToPromote) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent captain from promoting themselves
    if (memberToPromote.userId === user.id) {
      return NextResponse.json({ error: 'You are already the captain' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'promote') {
      // Promote the member to captain and demote current captain to member
      const memberRef = doc(db, 'teamMembers', memberId);
      const captainRef = doc(db, 'teamMembers', userMember.id);

      // Update both members - promote the new member to captain and demote current captain to member
      await updateDoc(memberRef, { role: 'CAPTAIN' });
      await updateDoc(captainRef, { role: 'MEMBER' });

      return NextResponse.json({ message: 'Member promoted to captain successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error promoting team member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
