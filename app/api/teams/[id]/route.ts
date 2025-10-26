import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getTeam, getTeamMembers, getUser, deleteTeam } from '@/lib/firestore';
import { convertFirestoreTimestamp } from '@/lib/utils';

// Helper function to obfuscate email
function obfuscateEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  // Show first character and last character of local part, replace middle with ***
  const obfuscatedLocal =
    localPart.length > 2 ? `${localPart[0]}***${localPart[localPart.length - 1]}` : localPart;

  return `${obfuscatedLocal}@${domain}`;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members
    const teamMembers = await getTeamMembers(teamId);

    // Check if user is a member of the team
    const userMember = teamMembers.find((member) => member.userId === user.id);
    const isMember = !!userMember;

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const memberUser = await getUser(member.userId);
        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          user: memberUser
            ? {
                id: memberUser.id,
                name: memberUser.name,
                email: memberUser.email,
                role: memberUser.role,
              }
            : null,
        };
      }),
    );

    // Obfuscate emails based on team scope
    const membersWithPrivacy = membersWithDetails.map((member) => {
      // For PUBLIC teams, always obfuscate emails (even for members)
      if (team.scope === 'PUBLIC') {
        return {
          ...member,
          user: member.user
            ? {
                ...member.user,
                email: obfuscateEmail(member.user.email),
              }
            : null,
        };
      }

      // If user is a member of non-PUBLIC teams, show full email
      if (isMember) {
        return member;
      }

      // For non-PUBLIC teams and non-members, don't show member details at all
      return {
        id: member.id,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: null,
      };
    });

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        scope: team.scope,
        createdAt: convertFirestoreTimestamp(team.createdAt),
      },
      members: membersWithPrivacy.map((member) => ({
        ...member,
        joinedAt: convertFirestoreTimestamp(member.joinedAt),
      })),
      isMember, // Include membership status for frontend
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members to check if user is captain
    const teamMembers = await getTeamMembers(teamId);
    const userMember = teamMembers.find((member) => member.userId === user.id);

    if (!userMember || userMember.role !== 'CAPTAIN') {
      return NextResponse.json({ error: 'Only team captains can delete teams' }, { status: 403 });
    }

    // Delete the team and all associated data
    await deleteTeam(teamId);

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
