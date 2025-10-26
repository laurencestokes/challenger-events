'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamHeaderSkeleton, TeamMembersListSkeleton } from '@/components/SkeletonLoaders';
import { TeamInvitation } from '@/lib/firestore';

interface TeamMember {
  id: string;
  userId: string;
  role: 'CAPTAIN' | 'MEMBER';
  joinedAt: Date | string;
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  scope?: 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY';
  logoUrl?: string;
  createdAt: Date | string;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'promote' | 'delete';
    memberId: string;
    memberName: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');

  const fetchTeamDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/teams/${params.id}`);
      setTeam(response.team);
      setMembers(response.members);
    } catch (error: unknown) {
      console.error('Error fetching team details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team details';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  // Check if current user is a member (to show member details properly)
  const _isMember = members.some((member) => member.userId === user?.id);

  const handleJoinPublicTeam = async () => {
    try {
      setIsProcessing(true);
      await api.post(`/api/teams/${params.id}/join`, { params });
      // Refresh team details to show updated membership
      fetchTeamDetails();
    } catch (error: unknown) {
      console.error('Error joining team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join team';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchPendingInvitations = useCallback(async () => {
    // Check if current user is captain
    const currentUserMember =
      user && !authLoading
        ? members.find((member) => member.userId === user.id || member.user?.email === user.email)
        : null;
    const userIsCaptain = currentUserMember?.role === 'CAPTAIN';

    if (!userIsCaptain) return; // Only captains can see pending invitations

    try {
      setIsLoadingInvitations(true);
      const response = await api.get(`/api/teams/${params.id}/invitations/pending`);
      setPendingInvitations(response.invitations || []);
    } catch (error: unknown) {
      console.error('Error fetching pending invitations:', error);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [params.id, user, authLoading, members]);

  useEffect(() => {
    if (params.id) {
      fetchTeamDetails();
    }
  }, [params.id, fetchTeamDetails]);

  useEffect(() => {
    if (params.id && user && !authLoading && members.length > 0) {
      const currentUserMember = members.find(
        (member) => member.userId === user.id || member.user?.email === user.email,
      );
      const userIsCaptain = currentUserMember?.role === 'CAPTAIN';

      if (userIsCaptain) {
        fetchPendingInvitations();
      }
    }
  }, [params.id, user, authLoading, members, fetchPendingInvitations]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      setInviteError(''); // Clear any previous errors
      const response = await api.post(`/api/teams/${params.id}/invite`, {
        email: inviteEmail.trim(),
      });

      setInviteSuccess(
        `Invitation email sent to ${inviteEmail}! The recipient can also use code: ${response.invitation.code}`,
      );
      setInviteEmail('');

      // Refresh pending invitations
      fetchPendingInvitations();

      // Clear success message and close modal after 3 seconds
      setTimeout(() => {
        setInviteSuccess('');
        setShowInviteModal(false);
      }, 3000);
    } catch (error: unknown) {
      console.error('Error sending invitation:', error);

      // Handle API error responses
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response: {
            data: { error: string; existingInvitation?: { code: string; expiresInDays: number } };
          };
        };
        const errorData = apiError.response.data;

        if (errorData.error === 'A pending invitation already exists for this email address') {
          // Show specific message for duplicate invitations
          const existingCode = errorData.existingInvitation?.code;
          const expiresInDays = errorData.existingInvitation?.expiresInDays;

          let message = `A pending invitation already exists for ${inviteEmail}.`;
          if (existingCode) {
            message += ` Use code: ${existingCode}`;
          }
          if (expiresInDays !== null && (expiresInDays as number) > 0) {
            message += ` (Expires in ${expiresInDays} day${expiresInDays === 1 ? '' : 's'})`;
          }

          setInviteError(message);
        } else {
          setInviteError(errorData.error || 'Failed to send invitation');
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
        setInviteError(errorMessage);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmAction || confirmAction.type !== 'remove') return;

    try {
      setIsProcessing(true);
      await api.delete(`/api/teams/${params.id}/members/${confirmAction.memberId}`);

      setShowConfirmModal(false);
      setConfirmAction(null);
      fetchTeamDetails(); // Refresh the team data
    } catch (error: unknown) {
      console.error('Error removing member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!user) return;

    try {
      setIsProcessing(true);
      // Find the current user's member record
      const currentMember = members.find((member) => member.userId === user.id);
      if (!currentMember) {
        setError('Could not find your membership record');
        return;
      }

      const response = await api.delete(`/api/teams/${params.id}/members/${currentMember.id}`);

      // Check if team was deleted (last member left)
      if (response.teamDeleted) {
        // Redirect to teams page since team no longer exists
        router.push('/teams');
      } else {
        // Redirect to teams page after leaving
        router.push('/teams');
      }
    } catch (error: unknown) {
      console.error('Error leaving team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave team';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!user) return;

    try {
      setIsProcessing(true);
      await api.delete(`/api/teams/${params.id}`);

      // Redirect to teams page after deleting
      router.push('/teams');
    } catch (error: unknown) {
      console.error('Error deleting team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromoteMember = async () => {
    if (!confirmAction || confirmAction.type !== 'promote') return;

    try {
      setIsProcessing(true);
      await api.patch(`/api/teams/${params.id}/members/${confirmAction.memberId}`, {
        action: 'promote',
      });

      setShowConfirmModal(false);
      setConfirmAction(null);
      fetchTeamDetails(); // Refresh the team data
    } catch (error: unknown) {
      console.error('Error promoting member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to promote member';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setIsEditing(true);
      await api.patch(`/api/teams/${params.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });

      setShowEditModal(false);
      setEditName('');
      setEditDescription('');
      fetchTeamDetails(); // Refresh the team data
    } catch (error: unknown) {
      console.error('Error updating team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update team';
      setError(errorMessage);
    } finally {
      setIsEditing(false);
    }
  };

  const openEditModal = () => {
    if (team) {
      setEditName(team.name);
      setEditDescription(team.description || '');
      setShowEditModal(true);
    }
  };

  const openInviteModal = () => {
    setInviteError(''); // Clear any previous errors
    setShowInviteModal(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoUploadError('Invalid file type. Only PNG, JPEG, JPG, GIF, and WEBP are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('File size exceeds 5MB limit.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use fetch directly instead of api.post to handle FormData properly
      const response = await fetch(`/api/teams/${params.id}/upload-logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user?.uid || user?.id}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      if (data.logoUrl) {
        // Update team state with new logo URL
        setTeam((prev) => (prev ? { ...prev, logoUrl: data.logoUrl } : null));
      }
    } catch (error: unknown) {
      console.error('Error uploading logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload logo';
      setLogoUploadError(errorMessage);
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const closeInviteModal = () => {
    setInviteError(''); // Clear any errors when closing
    setInviteSuccess(''); // Clear any success messages when closing
    setShowInviteModal(false);
  };

  const formatDate = (date: Date | string | unknown) => {
    try {
      let dateObj: Date;

      // Handle Firebase timestamps
      if (date && typeof date === 'object' && 'toDate' in date) {
        dateObj = (date as { toDate: () => Date }).toDate();
      } else if (date && typeof date === 'object' && 'seconds' in date) {
        dateObj = new Date((date as { seconds: number }).seconds * 1000);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date as string | number);
      }

      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }

      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'CAPTAIN':
        return 'Captain';
      case 'MEMBER':
        return 'Member';
      default:
        return role;
    }
  };

  const formatMemberCount = (count: number) => {
    return count === 1 ? '1 member' : `${count} members`;
  };

  // Check if current user is the captain
  const currentUserMember =
    user && !authLoading
      ? members.find((member) => member.userId === user.id || member.user?.email === user.email)
      : null;
  const isCaptain = currentUserMember?.role === 'CAPTAIN';

  if (isLoading || authLoading) {
    return (
      <ProtectedRoute>
        <div
          className="bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen"
          style={{ backgroundColor: '#0F0F0F' }}
        >
          <Header />
          <div className="flex-1 flex flex-col">
            <div className="container mx-auto px-4 py-8 flex-1">
              <TeamHeaderSkeleton />
              <TeamMembersListSkeleton />
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div
          className="bg-gray-50 dark:bg-gray-900 flex flex-col"
          style={{ backgroundColor: '#0F0F0F' }}
        >
          <Header />
          <div className="flex-1">
            <div className="container mx-auto px-4 py-8">
              <div className="bg-red-900/20 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
              <button
                onClick={() => router.push('/teams')}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
              >
                Back to Teams
              </button>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (!team) {
    return (
      <ProtectedRoute>
        <div
          className="bg-gray-50 dark:bg-gray-900 flex flex-col"
          style={{ backgroundColor: '#0F0F0F' }}
        >
          <Header />
          <div className="flex-1">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-gray-400">Team not found</p>
                <button
                  onClick={() => router.push('/teams')}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
                >
                  Back to Teams
                </button>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div
        className="bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen"
        style={{ backgroundColor: '#0F0F0F' }}
      >
        <Header />
        <div className="flex-1 flex flex-col">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
            {/* Breadcrumbs */}
            <nav
              className="mb-6 text-sm text-gray-400 flex items-center space-x-2 overflow-hidden"
              aria-label="Breadcrumb"
            >
              <button
                onClick={() => router.push('/teams')}
                className="hover:text-white transition-colors whitespace-nowrap"
              >
                Team Management
              </button>
              <span className="flex-shrink-0">/</span>
              <span className="text-white font-semibold truncate">{team.name}</span>
            </nav>

            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">
                    {team.name}
                  </h1>
                </div>
                {user && (
                  <>
                    {members.some((member) => member.userId === user.id) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {isCaptain && (
                          <>
                            <button
                              onClick={openEditModal}
                              className="px-3 sm:px-4 py-2 text-sm font-medium text-white rounded-md whitespace-nowrap"
                              style={{ backgroundColor: '#4682b4' }}
                              onMouseEnter={(e) =>
                                ((e.target as unknown as HTMLElement).style.backgroundColor =
                                  '#5a8bc4')
                              }
                              onMouseLeave={(e) =>
                                ((e.target as unknown as HTMLElement).style.backgroundColor =
                                  '#4682b4')
                              }
                            >
                              Edit Team
                            </button>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                onChange={handleLogoUpload}
                                disabled={isUploadingLogo}
                                className="hidden"
                                id="logo-upload"
                              />
                              <label
                                htmlFor="logo-upload"
                                className={`px-3 sm:px-4 py-2 text-sm font-medium text-white rounded-md whitespace-nowrap cursor-pointer ${
                                  isUploadingLogo
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                              </label>
                            </div>
                            <button
                              onClick={() => {
                                setConfirmAction({
                                  type: 'delete',
                                  memberId: '',
                                  memberName: 'the team',
                                });
                                setShowConfirmModal(true);
                              }}
                              className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap"
                            >
                              Delete Team
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setConfirmAction({
                              type: 'remove',
                              memberId: '', // Will be set in handleLeaveTeam
                              memberName: 'the team',
                            });
                            setShowConfirmModal(true);
                          }}
                          className="px-3 sm:px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-600 rounded-md hover:bg-red-900/20 whitespace-nowrap"
                        >
                          Leave Team
                        </button>
                      </div>
                    ) : team.scope === 'PUBLIC' ? (
                      <button
                        onClick={handleJoinPublicTeam}
                        disabled={isProcessing}
                        className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Joining...' : 'Join Team'}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
              {team.description && <p className="text-gray-400 mb-4">{team.description}</p>}
              <p className="text-sm text-gray-500">Created on {formatDate(team.createdAt)}</p>
              {logoUploadError && (
                <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded text-red-400 text-sm">
                  {logoUploadError}
                </div>
              )}
            </div>

            {/* Team Members */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Team Members ({formatMemberCount(members.length)})
                </h2>
                {isCaptain && (
                  <button
                    onClick={openInviteModal}
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-white rounded-md whitespace-nowrap self-start sm:self-auto"
                    style={{ backgroundColor: '#4682b4' }}
                    onMouseEnter={(e) =>
                      ((e.target as unknown as HTMLElement).style.backgroundColor = '#5a8bc4')
                    }
                    onMouseLeave={(e) =>
                      ((e.target as unknown as HTMLElement).style.backgroundColor = '#4682b4')
                    }
                  >
                    Invite User
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No members found</p>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => {
                    // Show privacy message for hidden members
                    if (!member.user) {
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-700/50 rounded-lg bg-gray-900/50 gap-4"
                        >
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium">?</span>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-gray-400">Private Member</h3>
                              <p className="text-sm text-gray-500">Member details are private</p>
                              <p className="text-xs text-gray-500">
                                Joined {formatDate(member.joinedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap self-start sm:self-auto ${
                                member.role === 'CAPTAIN'
                                  ? 'bg-primary-500/20 text-primary-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {getRoleDisplayName(member.role)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Show full member details for visible members
                    return (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-700/50 rounded-lg bg-gray-900/50 gap-4"
                      >
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {member.user?.name?.charAt(0) ||
                                  member.user?.email?.charAt(0) ||
                                  '?'}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-white truncate">
                              {member.user?.name || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-gray-400 truncate">{member.user?.email}</p>
                            <p className="text-xs text-gray-500">
                              Joined {formatDate(member.joinedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Captain-only actions */}
                          {isCaptain && member.userId !== user?.id && (
                            <div className="flex flex-wrap items-center gap-2">
                              {member.role === 'MEMBER' && (
                                <button
                                  onClick={() => {
                                    setConfirmAction({
                                      type: 'promote',
                                      memberId: member.id,
                                      memberName:
                                        member.user?.name || member.user?.email || 'Unknown User',
                                    });
                                    setShowConfirmModal(true);
                                  }}
                                  className="text-sm text-primary-400 hover:text-primary-300 whitespace-nowrap"
                                >
                                  Promote to Captain
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    type: 'remove',
                                    memberId: member.id,
                                    memberName:
                                      member.user?.name || member.user?.email || 'Unknown User',
                                  });
                                  setShowConfirmModal(true);
                                }}
                                className="text-sm text-red-400 hover:text-red-300 whitespace-nowrap"
                              >
                                Remove
                              </button>
                            </div>
                          )}

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap self-start sm:self-auto ${
                              member.role === 'CAPTAIN'
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {getRoleDisplayName(member.role)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Invitations Section - Only for Captains */}
            {isCaptain && (
              <div className="mt-8">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-white">
                      Pending Invitations
                      {pendingInvitations.length > 0 && (
                        <span className="text-sm text-gray-400 ml-2">
                          ({pendingInvitations.length})
                        </span>
                      )}
                    </h2>
                  </div>

                  {isLoadingInvitations ? (
                    <div className="space-y-4">
                      {[...Array(2)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 border border-gray-700/50 rounded-lg bg-gray-900/50 animate-pulse"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                            <div>
                              <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                              <div className="h-3 bg-gray-700 rounded w-48"></div>
                            </div>
                          </div>
                          <div className="h-6 bg-gray-700 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : pendingInvitations.length > 0 ? (
                    <div className="space-y-4">
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-700/50 rounded-lg bg-gray-900/50 gap-4"
                        >
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium">
                                {invitation.email?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-white truncate">
                                {invitation.email}
                              </h3>
                              <p className="text-sm text-gray-400">
                                Invited {formatDate(invitation.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-start sm:self-auto">
                            <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full whitespace-nowrap">
                              Pending
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              Code: {invitation.code}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-2">No pending invitations</p>
                      <p className="text-gray-500 text-sm">
                        Invite users to join your team using the "Invite User" button above
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invite User Modal */}
            {showInviteModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border border-gray-700/50 w-96 shadow-lg rounded-2xl bg-gray-800">
                  <div className="mt-3">
                    <h3 className="text-lg font-medium text-white mb-4">Invite User to Team</h3>
                    <form onSubmit={handleInviteUser} className="space-y-4">
                      <div>
                        <label
                          htmlFor="inviteEmail"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="inviteEmail"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-700"
                          placeholder="Enter email address"
                        />
                      </div>

                      {/* Success Message */}
                      {inviteSuccess && (
                        <div className="p-3 bg-green-900/50 border border-green-700 rounded-md">
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <p className="text-sm text-green-200">{inviteSuccess}</p>
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {inviteError && (
                        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
                          <p className="text-sm text-red-200">{inviteError}</p>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={closeInviteModal}
                          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isInviting}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                        >
                          {isInviting ? 'Sending...' : 'Send Invitation'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && confirmAction && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border border-gray-700/50 w-96 shadow-lg rounded-2xl bg-gray-800">
                  <div className="mt-3">
                    <h3 className="text-lg font-medium text-white mb-4">
                      {confirmAction.type === 'delete'
                        ? 'Delete Team'
                        : confirmAction.type === 'remove' && confirmAction.memberName === 'the team'
                          ? 'Leave Team'
                          : confirmAction.type === 'remove'
                            ? 'Remove Member'
                            : 'Promote to Captain'}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {confirmAction.type === 'delete'
                        ? 'Are you sure you want to delete this team? This will permanently delete the team and remove all members. This action cannot be undone.'
                        : confirmAction.type === 'remove' && confirmAction.memberName === 'the team'
                          ? 'Are you sure you want to leave this team? This action cannot be undone.'
                          : confirmAction.type === 'remove'
                            ? `Are you sure you want to remove ${confirmAction.memberName} from the team? This action cannot be undone.`
                            : `Are you sure you want to promote ${confirmAction.memberName} to captain? You will become a regular member.`}
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowConfirmModal(false);
                          setConfirmAction(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={
                          confirmAction.type === 'delete'
                            ? handleDeleteTeam
                            : confirmAction.type === 'remove' &&
                                confirmAction.memberName === 'the team'
                              ? handleLeaveTeam
                              : confirmAction.type === 'remove'
                                ? handleRemoveMember
                                : handlePromoteMember
                        }
                        disabled={isProcessing}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                          confirmAction.type === 'delete' || confirmAction.type === 'remove'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-primary-600 hover:bg-primary-700'
                        }`}
                      >
                        {isProcessing
                          ? 'Processing...'
                          : confirmAction.type === 'delete'
                            ? 'Delete Team'
                            : confirmAction.type === 'remove' &&
                                confirmAction.memberName === 'the team'
                              ? 'Leave Team'
                              : confirmAction.type === 'remove'
                                ? 'Remove'
                                : 'Promote'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Team Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border border-gray-700/50 w-96 shadow-lg rounded-2xl bg-gray-800">
                  <div className="mt-3">
                    <h3 className="text-lg font-medium text-white mb-4">Edit Team</h3>
                    <form onSubmit={handleEditTeam} className="space-y-4">
                      <div>
                        <label
                          htmlFor="editName"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Team Name *
                        </label>
                        <input
                          type="text"
                          id="editName"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-700"
                          placeholder="Enter team name"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="editDescription"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Description
                        </label>
                        <textarea
                          id="editDescription"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-700"
                          placeholder="Enter team description (optional)"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isEditing}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                        >
                          {isEditing ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
