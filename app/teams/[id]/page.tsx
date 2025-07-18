'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'promote' | 'delete';
    memberId: string;
    memberName: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  useEffect(() => {
    if (params.id) {
      fetchTeamDetails();
    }
  }, [params.id, fetchTeamDetails]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const response = await api.post(`/api/teams/${params.id}/invite`, {
        email: inviteEmail.trim(),
      });

      setInviteSuccess(
        `Invitation email sent to ${inviteEmail}! The recipient can also use code: ${response.invitation.code}`,
      );
      setInviteEmail('');
      setShowInviteModal(false);

      // Clear success message after 5 seconds
      setTimeout(() => setInviteSuccess(''), 5000);
    } catch (error: unknown) {
      console.error('Error sending invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      setError(errorMessage);
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

  const formatDate = (date: Date | string | unknown) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date as string | number);
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'CAPTAIN':
        return 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Check if current user is the captain
  const currentUserMember =
    user && !authLoading
      ? members.find((member) => member.userId === user.id || member.user?.email === user.email)
      : null;
  const isCaptain = currentUserMember?.role === 'CAPTAIN';

  // Debug logging for troubleshooting
  if (user && !authLoading && members.length > 0) {
    console.log('Current user:', { id: user.id, email: user.email });
    console.log(
      'Team members:',
      members.map((m) => ({ userId: m.userId, email: m.user?.email, role: m.role })),
    );
    console.log('Current user member:', currentUserMember);
    console.log('Is captain:', isCaptain);
  }

  if (isLoading || authLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex flex-col">
          <Header />
          <div className="flex-1">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading team details...</p>
                </div>
              </div>
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
        <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex flex-col">
          <Header />
          <div className="flex-1">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded">
                  {error}
                </div>
                <button
                  onClick={() => router.push('/teams')}
                  className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
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

  if (!team) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex flex-col">
          <Header />
          <div className="flex-1">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Team not found</p>
                  <button
                    onClick={() => router.push('/teams')}
                    className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Back to Teams
                  </button>
                </div>
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
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex flex-col">
        <Header />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push('/teams')}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {team.name}
                    </h1>
                  </div>
                  {user && members.some((member) => member.userId === user.id) && (
                    <div className="flex items-center space-x-2">
                      {isCaptain && (
                        <button
                          onClick={() => {
                            setConfirmAction({
                              type: 'delete',
                              memberId: '',
                              memberName: 'the team',
                            });
                            setShowConfirmModal(true);
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                        >
                          Delete Team
                        </button>
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
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Leave Team
                      </button>
                    </div>
                  )}
                </div>
                {team.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{team.description}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created on {formatDate(team.createdAt)}
                </p>
              </div>

              {/* Team Members */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Team Members ({members.length})
                  </h2>
                  {isCaptain && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                    >
                      Invite User
                    </button>
                  )}
                </div>

                {members.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No members found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                              <span className="text-primary-600 dark:text-primary-400 font-medium">
                                {member.user?.name?.charAt(0) ||
                                  member.user?.email?.charAt(0) ||
                                  '?'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {member.user?.name || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {member.user?.email}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Joined {formatDate(member.joinedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Captain-only actions */}
                          {isCaptain && member.userId !== user?.id && (
                            <div className="flex items-center space-x-2">
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
                                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
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
                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          )}

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}
                          >
                            {getRoleDisplayName(member.role)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Success Message */}
              {inviteSuccess && (
                <div className="mt-4 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-success-600 dark:text-success-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium text-success-800 dark:text-success-200">
                      {inviteSuccess}
                    </span>
                  </div>
                </div>
              )}

              {/* Invite User Modal */}
              {showInviteModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Invite User to Team
                      </h3>
                      <form onSubmit={handleInviteUser} className="space-y-4">
                        <div>
                          <label
                            htmlFor="inviteEmail"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="inviteEmail"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                            placeholder="Enter email address"
                          />
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
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
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {confirmAction.type === 'delete'
                          ? 'Delete Team'
                          : confirmAction.type === 'remove' &&
                              confirmAction.memberName === 'the team'
                            ? 'Leave Team'
                            : confirmAction.type === 'remove'
                              ? 'Remove Member'
                              : 'Promote to Captain'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {confirmAction.type === 'delete'
                          ? 'Are you sure you want to delete this team? This will permanently delete the team and remove all members. This action cannot be undone.'
                          : confirmAction.type === 'remove' &&
                              confirmAction.memberName === 'the team'
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
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
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
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
