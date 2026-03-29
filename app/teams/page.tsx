'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@lib/queryKeys';
import ProtectedRoute from '@components/ProtectedRoute';
import Header from '@components/Header';
import Footer from '@components/Footer';
import WelcomeSection from '@components/WelcomeSection';
import Link from 'next/link';
import Image from 'next/image';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { TeamCardSkeleton } from '@components/SkeletonLoaders';
import CreateTeamModal from '@components/CreateTeamModal';
import JoinTeamModal from '@components/JoinTeamModal';
import { EVENT_TYPES } from '@constants/eventTypes';

interface Team {
  id: string;
  name: string;
  description?: string;
  scope?: 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY';
  organizationId?: string;
  gymId?: string;
  createdAt: Date;
  updatedAt: Date;
  userRole?: 'CAPTAIN' | 'MEMBER' | null;
  isMember?: boolean;
  logoUrl?: string;
  memberCount?: number;
}

interface Score {
  id: string;
  eventId?: string | null;
  eventName?: string | null;
  activityId: string;
  activityName?: string | null;
  rawScore: number;
  calculatedScore: number;
  reps?: number;
  timestamp: unknown;
  testId?: string;
  verified?: boolean;
  notes?: string;
  workoutName?: string;
  event?: EventWithScores;
}

interface EventWithScores {
  id: string;
  name: string;
  code: string;
  status: string;
  joinedAt: unknown;
  scores: Score[];
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  code: string;
  invitedBy: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
  team?: {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    memberCount?: number;
  };
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  guestEventId?: string | null;
  verificationStatus?: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);

  // Admin add member modal state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [includeGuests, setIncludeGuests] = useState(true);
  const [memberRole, setMemberRole] = useState<'MEMBER' | 'CAPTAIN'>('MEMBER');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // TanStack Query: user/all teams
  const { data: teamsData, isLoading } = useQuery({
    queryKey: queryKeys.teams.all(),
    queryFn: async () => {
      if (isAdmin) {
        const response = await api.get('/api/teams/all');
        const allTeams = [...(response.userTeams || []), ...(response.availableTeams || [])];
        const teamsWithCounts = await Promise.all(
          allTeams.map(async (team: Team) => {
            try {
              const teamResponse = await api.get(`/api/teams/${team.id}`);
              return { ...team, memberCount: teamResponse.members?.length || 0 };
            } catch {
              return { ...team, memberCount: 0 };
            }
          }),
        );
        return teamsWithCounts;
      } else {
        const response = await api.get('/api/teams/user');
        return response.teams || [];
      }
    },
    enabled: !!user,
  });
  const teams: Team[] = teamsData ?? [];

  // TanStack Query: public teams (non-admin only)
  const { data: publicTeamsData, isLoading: isLoadingPublicTeams } = useQuery({
    queryKey: queryKeys.teams.public(),
    queryFn: async () => {
      const response = await api.get('/api/teams/public');
      const allPublicTeams: Team[] = response.teams || [];
      const userTeamIds = teams.map((t) => t.id);
      return allPublicTeams.filter((t) => !userTeamIds.includes(t.id));
    },
    enabled: !!user && !isAdmin,
  });
  const publicTeams: Team[] = publicTeamsData ?? [];

  // TanStack Query: user scores for WelcomeSection metrics
  const { data: allScoresData, isLoading: isLoadingScores } = useQuery({
    queryKey: queryKeys.users.scores(),
    queryFn: async () => {
      const allScoresResponse = await api
        .get('/api/user/all-scores')
        .catch(() => ({ success: false, data: [] }));
      const personalScores: Score[] = allScoresResponse.success ? allScoresResponse.data : [];

      const userEventsResponse = await api.get('/api/user/events').catch(() => []);
      const userEvents: EventWithScores[] = userEventsResponse || [];

      type ScoreWithEvent = Score & { event?: EventWithScores; testId?: string };
      const eventActivityScores: ScoreWithEvent[] = [];
      userEvents.forEach((event: EventWithScores) => {
        (event.scores || []).forEach((score: ScoreWithEvent) => {
          eventActivityScores.push({ ...score, event });
        });
      });

      const allScores: ScoreWithEvent[] = [...eventActivityScores, ...personalScores];

      const canonicalEventIds = EVENT_TYPES.map((type) => type.id);
      const canonicalScores = allScores.filter((score) => {
        const eventId = score.testId ?? score.activityId;
        return canonicalEventIds.includes(eventId);
      });

      const bestScoresByType: Record<string, number> = {};
      const bestVerifiedScoresByType: Record<string, number> = {};

      EVENT_TYPES.forEach((type) => {
        const scoresForType = canonicalScores.filter((s) => (s.testId ?? s.activityId) === type.id);
        const verifiedScores = scoresForType.filter((s) => s.event || s.verified);
        const unverifiedScores = scoresForType.filter((s) => !s.event && !s.verified);

        let bestVerified = verifiedScores[0];
        if (verifiedScores.length > 0) {
          bestVerified = verifiedScores.reduce((prev, curr) =>
            curr.calculatedScore > prev.calculatedScore ? curr : prev,
          );
        }
        let bestUnverified = unverifiedScores[0];
        if (unverifiedScores.length > 0) {
          bestUnverified = unverifiedScores.reduce((prev, curr) =>
            curr.calculatedScore > prev.calculatedScore ? curr : prev,
          );
        }
        const best = bestVerified || bestUnverified;
        if (best) bestScoresByType[type.id] = best.calculatedScore;
        if (bestVerified) bestVerifiedScoresByType[type.id] = bestVerified.calculatedScore;
      });

      const total = Object.values(bestScoresByType).reduce((sum, s) => sum + s, 0);
      const verified = Object.values(bestVerifiedScoresByType).reduce((sum, s) => sum + s, 0);
      return { total, verified };
    },
    enabled: !!user,
  });
  const totalScore = allScoresData?.total ?? 0;
  const verifiedScore = allScoresData?.verified ?? 0;

  // Pending invitations (user-level, kept as local fetch - no matching queryKey)
  useEffect(() => {
    if (user) {
      fetchPendingInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Admin: Search users for adding to teams
  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(
        `/api/admin/users/search?q=${encodeURIComponent(searchTerm)}&includeGuests=${includeGuests}&limit=20`,
      );
      setSearchResults(response.users || []);
    } catch (error: unknown) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isAddMemberModalOpen) {
      const debounceTimer = setTimeout(() => {
        if (searchTerm.trim()) {
          handleSearchUsers();
        } else {
          setSearchResults([]);
        }
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, includeGuests, isAddMemberModalOpen]);

  const handleAddMembers = async () => {
    if (!selectedTeam || selectedUserIds.length === 0) {
      return;
    }

    setIsAddingMembers(true);
    try {
      const response = await api.post(`/api/admin/teams/${selectedTeam.id}/members`, {
        userIds: selectedUserIds,
        role: memberRole,
      });

      if (response.added && response.added.length > 0) {
        alert(`Successfully added ${response.added.length} member(s) to ${selectedTeam.name}`);
        // Reset state
        setSelectedUserIds([]);
        setSearchTerm('');
        setSearchResults([]);
        setIsAddMemberModalOpen(false);
        setSelectedTeam(null);
        // Invalidate teams query to update member counts
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.all() });
      }

      if (response.errors && response.errors.length > 0) {
        const errorMessages = response.errors
          .map((e: { userId: string; error: string }) => e.error)
          .join(', ');
        alert(`Some errors occurred: ${errorMessages}`);
      }
    } catch (error: unknown) {
      console.error('Error adding members:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || 'Failed to add members';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleOpenAddMemberModal = (team?: Team) => {
    setSelectedTeam(team || null);
    setSelectedUserIds([]);
    setSearchTerm('');
    setSearchResults([]);
    setTeamSearchTerm('');
    setIsAddMemberModalOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  // Colors for team card footers (cycling through)
  const teamFooterColors = [
    'bg-red-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-primary',
    'bg-teal-500',
    'bg-cyan-500',
  ];

  const getTeamFooterColor = (index: number) => {
    return teamFooterColors[index % teamFooterColors.length];
  };

  const formatMemberCount = (count: number) => {
    return count === 1 ? '1 member' : `${count} members`;
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await api.get('/api/teams/invitations/pending');
      setPendingInvitations(response.invitations || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const respondToInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      await api.post(`/api/teams/invitations/${invitationId}/respond`, {
        action,
      });
      // Invalidate teams and refresh invitations
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all() });
      fetchPendingInvitations();
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      // TODO: Add a toast notification here to show the error to the user
    }
  };

  const handleTeamSuccess = () => {
    // Invalidate queries to show the newly created/joined team
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all() });
    if (!isAdmin) {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.public() });
    }
  };

  const handleJoinPublicTeam = async (teamId: string) => {
    try {
      await api.post(`/api/teams/${teamId}/join`, {});
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.public() });
    } catch (error) {
      console.error('Error joining team:', error);
      // TODO: Add toast notification for error
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col">
        <Header />
        <div className="flex-1">
          <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <WelcomeSection
              showMetrics={true}
              verifiedScore={verifiedScore}
              totalScore={totalScore}
              isLoading={isLoadingScores}
            />

            {/* Breadcrumbs */}
            <nav
              className="mb-6 text-sm text-muted flex items-center space-x-2"
              aria-label="Breadcrumb"
            >
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-white font-semibold">Team Management</span>
            </nav>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
              <p className="text-muted">
                {isAdmin
                  ? 'Create teams, join existing ones, and manage team memberships. As an admin, you can manually add users to any team.'
                  : 'Create teams, join existing ones, and manage your team memberships'}
              </p>
            </div>

            {/* Admin Quick Add Members Section */}
            {isAdmin && (
              <div className="mb-8">
                <div className="panel rounded-2xl  p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">Quick Add Members</h2>
                      <p className="text-sm text-muted">
                        Quickly add users (including guests) to any team
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Open modal with team selection first
                        setSelectedTeam(null);
                        setSelectedUserIds([]);
                        setSearchTerm('');
                        setSearchResults([]);
                        setIsAddMemberModalOpen(true);
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Add Members to Team
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* My Teams Section / All Teams (for admins) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">
                  {isAdmin ? 'All Teams' : 'My Teams'}
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-muted hover:text-white text-sm border border-border px-3 py-1 rounded-lg transition-colors"
                >
                  Create Team
                </button>
              </div>

              {isLoading ? (
                <div className="flex space-x-4 pb-4 overflow-hidden">
                  <TeamCardSkeleton />
                  <TeamCardSkeleton />
                  <TeamCardSkeleton />
                  <TeamCardSkeleton />
                  <TeamCardSkeleton />
                </div>
              ) : teams.length > 0 ? (
                <div className="flex space-x-4 pb-4 overflow-x-auto">
                  {teams.map((team, index) => (
                    <div
                      key={team.id}
                      className="w-64 h-48 bg-surface-low rounded-lg flex-shrink-0 relative overflow-hidden hover:scale-105 transition-transform duration-200"
                    >
                      <Link
                        href={`/teams/${team.id}`}
                        className="absolute inset-0 z-0"
                        onClick={(e) => {
                          // Allow clicking through to team page unless clicking the admin button
                          if (!isAdmin) return;
                          const target = e.target as HTMLElement;
                          if (target.closest('.admin-add-member-btn')) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {/* Team Background/Logo */}
                        <div className="absolute inset-0">
                          {team.logoUrl ? (
                            <Image
                              src={team.logoUrl}
                              alt={team.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Image
                                src="/challenger-logo-no-text.png"
                                alt="Challenger logo"
                                width={80}
                                height={80}
                                className="opacity-80"
                              />
                            </div>
                          )}
                          {/* Dark overlay for text readability */}
                          <div className="absolute inset-0 bg-black/30" />
                        </div>

                        {/* Team Title Overlay */}
                        <div className="absolute top-4 left-4 right-4 z-10">
                          <h3 className="text-white font-bold text-lg leading-tight">
                            {team.name}
                          </h3>
                          {team.description && (
                            <p className="text-white/80 text-sm mt-1 line-clamp-2">
                              {team.description}
                            </p>
                          )}
                        </div>

                        {/* Team Info Footer */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${getTeamFooterColor(index)} p-3`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-white text-sm">
                              <FiUsers className="w-4 h-4" />
                              <span>{formatMemberCount(team.memberCount || 0)}</span>
                            </div>
                            <div className="text-white text-sm">
                              {team.userRole === 'CAPTAIN'
                                ? 'Captain'
                                : team.userRole === 'MEMBER'
                                  ? 'Member'
                                  : isAdmin
                                    ? 'Admin View'
                                    : ''}
                            </div>
                          </div>
                          <div className="text-white text-sm mt-1 opacity-90">View Team</div>
                        </div>
                      </Link>
                      {/* Admin Add Member Button */}
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenAddMemberModal(team)}
                          className="admin-add-member-btn absolute bottom-[4.5rem] right-2 z-20 px-3 py-1.5 bg-primary hover:bg-primary-light text-white rounded-md text-xs font-medium transition-colors shadow-lg"
                        >
                          Add Members
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Create Team Box */}
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-64 h-48 bg-surface-low rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-gray-500 transition-colors"
                  >
                    <FiPlus className="w-8 h-8 text-muted mb-2" />
                    <span className="text-muted text-sm">Create Team</span>
                  </button>

                  {/* Join Team by Code Box */}
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="w-64 h-48 bg-surface-low rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-gray-500 transition-colors"
                  >
                    <FiUsers className="w-8 h-8 text-muted mb-2" />
                    <span className="text-muted text-sm">Join Team by Code</span>
                  </button>
                </div>
              ) : (
                <div className="panel rounded-2xl p-8  text-center">
                  <div className="text-muted mb-4">
                    <FiUsers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-lg font-medium">No teams yet</p>
                    <p className="text-sm">Create or join a team to get started</p>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary transition-colors"
                  >
                    Create Your First Team
                  </button>
                </div>
              )}
            </div>

            {/* Public Teams Section - For non-admin users */}
            {!isAdmin && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white text-2xl font-bold">Public Teams</h2>
                  {publicTeams.length > 0 && (
                    <span className="text-sm text-muted">{publicTeams.length} available</span>
                  )}
                </div>

                {isLoadingPublicTeams ? (
                  <div className="flex space-x-4 pb-4 overflow-hidden">
                    <TeamCardSkeleton />
                    <TeamCardSkeleton />
                    <TeamCardSkeleton />
                  </div>
                ) : publicTeams.length > 0 ? (
                  <div className="flex space-x-4 pb-4 overflow-x-auto">
                    {publicTeams.map((team, index) => (
                      <div
                        key={team.id}
                        className="w-64 h-48 bg-surface-low rounded-lg flex-shrink-0 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => router.push(`/teams/${team.id}`)}
                      >
                        {/* Team Background/Logo */}
                        <div className="absolute inset-0">
                          {team.logoUrl ? (
                            <Image
                              src={team.logoUrl}
                              alt={team.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Image
                                src="/challenger-logo-no-text.png"
                                alt="Challenger logo"
                                width={80}
                                height={80}
                                className="opacity-80"
                              />
                            </div>
                          )}
                          {/* Dark overlay for text readability */}
                          <div className="absolute inset-0 bg-black/30" />
                        </div>

                        {/* Team Title Overlay */}
                        <div className="absolute top-4 left-4 right-4 z-10">
                          <h3 className="text-white font-bold text-lg leading-tight">
                            {team.name}
                          </h3>
                          {team.description && (
                            <p className="text-white/80 text-sm mt-1 line-clamp-2">
                              {team.description}
                            </p>
                          )}
                        </div>

                        {/* Team Info Footer */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${getTeamFooterColor(index)} p-3`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-white text-sm">
                              <FiUsers className="w-4 h-4" />
                              <span>{formatMemberCount(team.memberCount || 0)}</span>
                            </div>
                            <div className="text-white text-sm">Public</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleJoinPublicTeam(team.id);
                            }}
                            className="w-full mt-2 px-3 py-1.5 bg-surface-low/20 hover:bg-surface-low/30 text-white text-sm rounded transition-colors"
                          >
                            Join Team
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="panel rounded-2xl p-6 ">
                    <div className="text-center py-8">
                      <FiUsers className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
                      <p className="text-muted mb-4">No public teams available</p>
                      <p className="text-muted text-sm">
                        Public teams will appear here when created by administrators
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending Invitations Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">Team Invitations</h2>
                {pendingInvitations.length > 0 && (
                  <span className="text-sm text-muted">{pendingInvitations.length} pending</span>
                )}
              </div>

              {isLoadingInvitations ? (
                <div className="flex space-x-4 pb-4 overflow-hidden">
                  <TeamCardSkeleton />
                  <TeamCardSkeleton />
                </div>
              ) : pendingInvitations.length > 0 ? (
                <div className="flex space-x-4 pb-4 overflow-x-auto">
                  {pendingInvitations.map((invitation, _index) => (
                    <div key={invitation.id} className="flex-shrink-0">
                      {/* Team Card - Same as My Teams */}
                      <div className="w-64 h-48 bg-surface-low rounded-lg relative overflow-hidden hover:scale-105 transition-transform duration-200">
                        {/* Team Background/Logo */}
                        <div className="absolute inset-0">
                          {invitation.team?.logoUrl ? (
                            <Image
                              src={invitation.team.logoUrl}
                              alt={invitation.team.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Image
                                src="/challenger-logo-no-text.png"
                                alt="Challenger logo"
                                width={80}
                                height={80}
                                className="opacity-80"
                              />
                            </div>
                          )}
                          {/* Dark overlay for text readability */}
                          <div className="absolute inset-0 bg-black/30" />
                        </div>

                        {/* Team Title Overlay */}
                        <div className="absolute top-4 left-4 right-4 z-10">
                          <h3 className="text-white font-bold text-lg leading-tight">
                            {invitation.team?.name || 'Unknown Team'}
                          </h3>
                          {invitation.team?.description && (
                            <p className="text-white/80 text-sm mt-1 line-clamp-2">
                              {invitation.team.description}
                            </p>
                          )}
                        </div>

                        {/* Team Info Footer with Steel Blue Color */}
                        <div
                          className="absolute bottom-0 left-0 right-0 p-3 rounded-b-lg"
                          style={{ backgroundColor: '#4682b4' }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-white text-sm">
                              <FiUsers className="w-4 h-4" />
                              <span>{formatMemberCount(invitation.team?.memberCount || 0)}</span>
                            </div>
                            <div className="text-white text-sm">Invitation</div>
                          </div>
                          {invitation.inviter && (
                            <div className="text-white/90 text-xs mt-1">
                              Invited by {invitation.inviter.name || invitation.inviter.email}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons - Completely separate below the card */}
                      <div className="mt-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => respondToInvitation(invitation.id, 'decline')}
                            className="flex-1 px-3 py-2 bg-surface-high text-white rounded-lg hover:bg-surface-high transition-colors text-sm"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => respondToInvitation(invitation.id, 'accept')}
                            className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors text-sm"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Join Team by Code Box */}
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="w-64 h-48 bg-surface-low rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-gray-500 transition-colors"
                  >
                    <FiUsers className="w-8 h-8 text-muted mb-2" />
                    <span className="text-muted text-sm">Join Team by Code</span>
                  </button>
                </div>
              ) : (
                <div className="panel rounded-2xl p-6 ">
                  <div className="text-center py-8">
                    <FiUsers className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
                    <p className="text-muted mb-4">No pending team invitations</p>
                    <p className="text-muted text-sm mb-6">
                      Team captains can invite you by email or you can join with a team code
                    </p>
                    <button
                      onClick={() => setIsJoinModalOpen(true)}
                      className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary transition-colors"
                    >
                      Join Team by Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTeamSuccess}
      />

      {/* Join Team Modal */}
      <JoinTeamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={handleTeamSuccess}
      />

      {/* Admin: Add Member Modal */}
      {isAdmin && isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-carbon/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-surface-low border-surface-high">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedTeam ? `Add Members to ${selectedTeam.name}` : 'Add Members to Team'}
              </h3>
              <p className="text-sm text-muted">
                {selectedTeam
                  ? 'Search for users (including guest users) and add them to this team'
                  : 'Select a team and search for users (including guest users) to add'}
              </p>
            </div>

            {/* Team Selection (if no team selected yet) */}
            {!selectedTeam && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Team
                </label>
                {/* Team Search Input */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search teams by name or description..."
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface-high text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-surface-high rounded-md bg-surface-high">
                  {teams.length === 0 ? (
                    <div className="p-4 text-center text-muted text-sm">No teams available</div>
                  ) : (
                    (() => {
                      // Filter teams based on search term
                      const filteredTeams = teams.filter((team) => {
                        if (!teamSearchTerm.trim()) return true;
                        const searchLower = teamSearchTerm.toLowerCase();
                        return (
                          team.name.toLowerCase().includes(searchLower) ||
                          team.description?.toLowerCase().includes(searchLower) ||
                          team.scope?.toLowerCase().includes(searchLower)
                        );
                      });

                      if (filteredTeams.length === 0) {
                        return (
                          <div className="p-4 text-center text-muted text-sm">
                            No teams found matching "{teamSearchTerm}"
                          </div>
                        );
                      }

                      return filteredTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className="w-full text-left p-3 border-b border-border hover:bg-surface-high transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{team.name}</p>
                              {team.description && (
                                <p className="text-sm text-muted mt-1 line-clamp-1">
                                  {team.description}
                                </p>
                              )}
                              <p className="text-xs text-muted mt-1">
                                {team.memberCount || 0} members • {team.scope || 'N/A'}
                              </p>
                            </div>
                            <svg
                              className="w-5 h-5 text-muted"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      ));
                    })()
                  )}
                </div>
              </div>
            )}

            {/* Role Selection (only show when team is selected) */}
            {selectedTeam && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Member Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as 'MEMBER' | 'CAPTAIN')}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-high text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="MEMBER">Member</option>
                  <option value="CAPTAIN">Captain</option>
                </select>
              </div>
            )}

            {/* Search (only show when team is selected) */}
            {selectedTeam && (
              <div className="mb-4">
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Search by name, email, or user ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-surface-high text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={includeGuests}
                      onChange={(e) => setIncludeGuests(e.target.checked)}
                      className="mr-2 rounded border-border bg-surface-high text-primary focus:ring-primary"
                    />
                    Include guest users
                  </label>
                </div>
              </div>
            )}

            {/* Selected Users */}
            {selectedTeam && selectedUserIds.length > 0 && (
              <div className="mb-4 p-3 bg-primary-900/20 border border-primary-700/50 rounded-md">
                <p className="text-sm text-primary-300 mb-2">
                  {selectedUserIds.length} user(s) selected
                </p>
              </div>
            )}

            {/* Search Results */}
            {selectedTeam && isSearching ? (
              <div className="text-center py-4">
                <p className="text-muted">Searching...</p>
              </div>
            ) : selectedTeam && searchResults.length > 0 ? (
              <div className="max-h-96 overflow-y-auto border border-surface-high rounded-md mb-4">
                {searchResults.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`p-3 border-b border-surface-high cursor-pointer hover:bg-surface-high/50 transition-colors ${
                        isSelected ? 'bg-primary-900/20 border-primary-700/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {user.name || 'No name'}
                            {user.isGuest && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded">
                                Guest
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted">{user.email}</p>
                          <p className="text-xs text-muted mt-1">ID: {user.id}</p>
                        </div>
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-primary-light"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedTeam && searchTerm.trim() ? (
              <div className="text-center py-4">
                <p className="text-muted">No users found</p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  if (selectedTeam) {
                    // If team is selected, go back to team selection
                    setSelectedTeam(null);
                    setSelectedUserIds([]);
                    setSearchTerm('');
                    setSearchResults([]);
                    setTeamSearchTerm('');
                  } else {
                    // If no team selected, close modal
                    setIsAddMemberModalOpen(false);
                    setTeamSearchTerm('');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high hover:bg-surface-high rounded-md transition-colors"
              >
                {selectedTeam ? 'Back' : 'Cancel'}
              </button>
              {selectedTeam && (
                <button
                  onClick={handleAddMembers}
                  disabled={selectedUserIds.length === 0 || isAddingMembers}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingMembers ? 'Adding...' : `Add ${selectedUserIds.length} Member(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
