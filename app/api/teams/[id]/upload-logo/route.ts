import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, isAdmin, updateTeamLogo, getTeam, getTeamMembers } from '@/lib/firestore';

// Simple endpoint to handle logo URL updates after client-side upload
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.replace('Bearer ', '');
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamId = params.id;
    const body = await request.json();
    const { logoUrl } = body;

    if (!logoUrl) {
      return NextResponse.json({ error: 'Missing logo URL' }, { status: 400 });
    }

    // Check if team exists
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is admin or team member
    const isUserAdmin = await isAdmin(userId);
    const teamMembers = await getTeamMembers(teamId);
    const isTeamMember = teamMembers.some((member) => member.userId === user.id);

    if (!isUserAdmin && !isTeamMember) {
      return NextResponse.json({ error: 'Not authorized to update this team' }, { status: 403 });
    }

    // Update team document with logo URL
    await updateTeamLogo(teamId, logoUrl);

    return NextResponse.json({
      message: 'Logo updated successfully',
      logoUrl,
    });
  } catch (error) {
    console.error('Error updating team logo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
