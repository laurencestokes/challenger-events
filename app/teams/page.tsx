'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WelcomeSection from '@/components/WelcomeSection';
import Link from 'next/link';
import Image from 'next/image';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { TeamCardSkeleton } from '@/components/SkeletonLoaders';
import CreateTeamModal from '@/components/CreateTeamModal';
import JoinTeamModal from '@/components/JoinTeamModal';
import { EVENT_TYPES } from '@/constants/eventTypes';

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

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [publicTeams, setPublicTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPublicTeams, setIsLoadingPublicTeams] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [verifiedScore, setVerifiedScore] = useState(0);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (user) {
      fetchTeams();
      fetchUserScores();
      fetchPendingInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch public teams after user teams are loaded
  useEffect(() => {
    if (user && !isAdmin && teams.length >= 0) {
      fetchPublicTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/api/teams/user');
      setTeams(response.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublicTeams = async () => {
    try {
      const response = await api.get('/api/teams/public');
      const allPublicTeams = response.teams || [];

      // Filter out teams that the user is already a member of
      const userTeamIds = teams.map((team) => team.id);
      const availablePublicTeams = allPublicTeams.filter(
        (team: Team) => !userTeamIds.includes(team.id),
      );

      setPublicTeams(availablePublicTeams);
    } catch (error) {
      console.error('Error fetching public teams:', error);
    } finally {
      setIsLoadingPublicTeams(false);
    }
  };

  const fetchUserScores = async () => {
    try {
      // Fetch all scores (both personal and event scores)
      const allScoresResponse = await api
        .get('/api/user/all-scores')
        .catch(() => ({ success: false, data: [] }));
      const personalScores: Score[] = allScoresResponse.success ? allScoresResponse.data : [];

      // Fetch user's events with scores (like public profile does)
      const userEventsResponse = await api.get('/api/user/events').catch(() => []);
      const userEvents: EventWithScores[] = userEventsResponse || [];

      // Flatten event scores into activity scores, attaching event info (like public profile)
      type ScoreWithEvent = Score & { event?: EventWithScores; testId?: string };
      const eventActivityScores: ScoreWithEvent[] = [];
      userEvents.forEach((event: EventWithScores) => {
        (event.scores || []).forEach((score: ScoreWithEvent) => {
          eventActivityScores.push({ ...score, event });
        });
      });

      // Combine with personal scores
      const allScores: ScoreWithEvent[] = [...eventActivityScores, ...personalScores];

      // Calculate verified and total scores using the same logic as public profile
      // Only include canonical event types (all EVENT_TYPES) for overall scoring
      const canonicalEventIds = EVENT_TYPES.map((type) => type.id);
      const canonicalScores = allScores.filter((score) => {
        const eventId = score.testId ?? score.activityId;
        return canonicalEventIds.includes(eventId);
      });

      // Calculate best scores for each canonical event type
      const bestScoresByType: Record<string, number> = {};
      const bestVerifiedScoresByType: Record<string, number> = {};

      EVENT_TYPES.forEach((type) => {
        const scoresForType = canonicalScores.filter((s) => (s.testId ?? s.activityId) === type.id);

        // All scores: best of verified or unverified
        // A score is verified if it's from an event (has event property) OR has verified flag set to true
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
        if (best) {
          bestScoresByType[type.id] = best.calculatedScore;
        }

        // Only verified scores
        if (bestVerified) {
          bestVerifiedScoresByType[type.id] = bestVerified.calculatedScore;
        }
      });

      // Calculate totals
      const total = Object.values(bestScoresByType).reduce((sum, score) => sum + score, 0);
      const verified = Object.values(bestVerifiedScoresByType).reduce(
        (sum, score) => sum + score,
        0,
      );

      setTotalScore(total);
      setVerifiedScore(verified);
    } catch (error) {
      console.error('Error fetching user scores:', error);
    } finally {
      setIsLoadingScores(false);
    }
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
    'bg-primary-500',
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
      const _response = await api.post(`/api/teams/invitations/${invitationId}/respond`, {
        action,
      });
      // Refresh both teams and invitations
      fetchTeams();
      fetchPendingInvitations();
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      // TODO: Add a toast notification here to show the error to the user
    }
  };

  const handleTeamSuccess = () => {
    // Refresh the data to show the newly created/joined team
    fetchTeams();
    if (!isAdmin) {
      fetchPublicTeams();
    }
  };

  const handleJoinPublicTeam = async (teamId: string) => {
    try {
      await api.post(`/api/teams/${teamId}/join`, {});
      handleTeamSuccess();
    } catch (error) {
      console.error('Error joining team:', error);
      // TODO: Add toast notification for error
    }
  };

  return (
    <ProtectedRoute>
      <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
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
              className="mb-6 text-sm text-gray-400 flex items-center space-x-2"
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
              <p className="text-gray-400">
                Create teams, join existing ones, and manage your team memberships
              </p>
            </div>

            {/* My Teams Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">My Teams</h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
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
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden hover:scale-105 transition-transform duration-200"
                    >
                      {/* Team Background/Logo */}
                      <div className="absolute inset-0">
                        {team.logoUrl ? (
                          <Image src={team.logoUrl} alt={team.name} fill className="object-cover" />
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
                        <h3 className="text-white font-bold text-lg leading-tight">{team.name}</h3>
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
                            {team.userRole === 'CAPTAIN' ? 'Captain' : 'Member'}
                          </div>
                        </div>
                        <div className="text-white text-sm mt-1 opacity-90">View Team</div>
                      </div>
                    </Link>
                  ))}

                  {/* Create Team Box */}
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <FiPlus className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-400 text-sm">Create Team</span>
                  </button>

                  {/* Join Team by Code Box */}
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <FiUsers className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-400 text-sm">Join Team by Code</span>
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 text-center">
                  <div className="text-gray-400 mb-4">
                    <FiUsers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-lg font-medium">No teams yet</p>
                    <p className="text-sm">Create or join a team to get started</p>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
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
                    <span className="text-sm text-gray-400">{publicTeams.length} available</span>
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
                        className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
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
                            className="w-full mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded transition-colors"
                          >
                            Join Team
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <div className="text-center py-8">
                      <FiUsers className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                      <p className="text-gray-400 mb-4">No public teams available</p>
                      <p className="text-gray-500 text-sm">
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
                  <span className="text-sm text-gray-400">{pendingInvitations.length} pending</span>
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
                      <div className="w-64 h-48 bg-gray-800 rounded-lg relative overflow-hidden hover:scale-105 transition-transform duration-200">
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
                            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => respondToInvitation(invitation.id, 'accept')}
                            className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
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
                    className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <FiUsers className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-400 text-sm">Join Team by Code</span>
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                  <div className="text-center py-8">
                    <FiUsers className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-gray-400 mb-4">No pending team invitations</p>
                    <p className="text-gray-500 text-sm mb-6">
                      Team captains can invite you by email or you can join with a team code
                    </p>
                    <button
                      onClick={() => setIsJoinModalOpen(true)}
                      className="inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
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
    </ProtectedRoute>
  );
}
