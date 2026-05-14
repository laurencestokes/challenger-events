'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api-client';
import { getCurrentUser } from '@lib/firebase-auth';
import { queryKeys } from '@lib/queryKeys';
import ProtectedRoute from '@components/ProtectedRoute';
import WelcomeSection from '@components/WelcomeSection';
import ScoreSubmissionModal from '@components/ScoreSubmissionModal';
import ConfirmModal from '@components/ConfirmModal';
import Link from 'next/link';
import { FiX } from 'react-icons/fi';

interface Participant {
  id: string;
  name: string;
  email?: string;
  age?: number;
  sex?: 'M' | 'F';
  bodyweight?: number;
  isGuest?: boolean;
  joinedAt?: unknown;
  teamId?: string;
  teamName?: string;
}

interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  isGuest?: boolean;
  status?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Score {
  id: string;
  userId: string;
  eventId: string;
  activityId: string;
  activityName: string;
  activityType?: string;
  activityUnit?: string;
  rawValue: number;
  calculatedScore: number;
  reps?: number;
  notes?: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  teamId?: string | null;
  submittedAt: Date;
  updatedAt: Date;
}

interface CollisionInfo {
  existingUserId: string;
  existingUserName: string;
  existingUserEmail: string;
}

// Inline fetch wrapper used for participant adds: we need to inspect 409 response bodies
// (the shared api-client throws away anything but the message).
async function postParticipant(eventId: string, body: unknown) {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  const response = await fetch(`/api/admin/events/${eventId}/guest-participants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.uid}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

export default function EventParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const eventId = params.id as string;

  // Local UI state
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [participantScores, setParticipantScores] = useState<Score[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<Score | null>(null);
  const [assigningTeam, setAssigningTeam] = useState<string | null>(null);

  // Add-participant modal: mode + existing-user state
  const [addMode, setAddMode] = useState<'existing' | 'guest'>('existing');
  const [existingSearch, setExistingSearch] = useState('');
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<string | null>(null);
  const [collision, setCollision] = useState<CollisionInfo | null>(null);

  // Remove participant confirmation
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);

  // Form state for adding/editing guest
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [bodyweight, setBodyweight] = useState('');

  // --- Queries ---

  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => api.get(`/api/events/${eventId}`),
    enabled: !!eventId,
  });

  const participantsQuery = useQuery({
    queryKey: queryKeys.events.participants(eventId),
    queryFn: () => api.get(`/api/events/${eventId}/participants`),
    enabled: !!eventId,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams.all(),
    queryFn: () => api.get('/api/teams/all'),
    enabled: !!eventId && !!eventQuery.data?.isTeamEvent,
  });

  const orphanedScoresQuery = useQuery({
    queryKey: ['events', eventId, 'orphaned-scores'],
    queryFn: () => api.get(`/api/events/${eventId}/orphaned-scores`),
    enabled: !!eventId,
  });

  // Admin users list — used to power the "Existing user" search in the add-participant modal.
  // Lazy-loaded only when needed (modal is open + we're on existing tab or showing a collision prompt).
  const adminUsersQuery = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => api.get('/api/admin/users'),
    enabled: !!eventId && showAddModal && (addMode === 'existing' || !!collision),
  });

  // Derived data
  const event = eventQuery.data ?? null;
  const participants: Participant[] = participantsQuery.data?.participants || [];
  const teams: Team[] = [
    ...(teamsQuery.data?.userTeams || []),
    ...(teamsQuery.data?.availableTeams || []),
  ];
  const orphanedScores: Score[] = orphanedScoresQuery.data?.scores || [];
  const isLoading = eventQuery.isLoading || participantsQuery.isLoading;
  const isLoadingOrphanedScores = orphanedScoresQuery.isFetching;

  const participantIds = useMemo(() => new Set(participants.map((p) => p.id)), [participants]);

  const eligibleUsers: AdminUserSummary[] = useMemo(() => {
    const all: AdminUserSummary[] = adminUsersQuery.data?.users || [];
    return all.filter((u) => !u.isGuest && !participantIds.has(u.id));
  }, [adminUsersQuery.data, participantIds]);

  const filteredExistingUsers = useMemo(() => {
    const q = existingSearch.trim().toLowerCase();
    if (!q) return eligibleUsers.slice(0, 20);
    return eligibleUsers
      .filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [eligibleUsers, existingSearch]);

  // --- Mutations ---

  const addParticipantMutation = useMutation({
    mutationFn: async (payload: {
      mode: 'existing' | 'guest';
      userId?: string;
      name?: string;
      email?: string;
      ageNum?: number;
      sex?: 'M' | 'F';
      bodyweightNum?: number;
    }) => {
      if (payload.mode === 'existing') {
        const result = await postParticipant(eventId, {
          mode: 'existing',
          userId: payload.userId,
        });
        if (!result.ok) {
          throw Object.assign(new Error(result.payload?.error || 'Failed to add participant'), {
            responseBody: result.payload,
            status: result.status,
          });
        }
        return result.payload;
      }

      const result = await postParticipant(eventId, {
        mode: 'guest',
        name: payload.name,
        email: payload.email || undefined,
        age: payload.ageNum,
        sex: payload.sex,
        bodyweight: payload.bodyweightNum,
      });
      if (!result.ok) {
        throw Object.assign(new Error(result.payload?.error || 'Failed to add participant'), {
          responseBody: result.payload,
          status: result.status,
        });
      }
      return result.payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
      closeAddModal();
    },
    onError: (
      err: Error & {
        responseBody?: {
          error_code?: string;
          existingUserId?: string;
          existingUserName?: string;
          existingUserEmail?: string;
        };
      },
    ) => {
      if (err.responseBody?.error_code === 'EMAIL_BELONGS_TO_REGISTERED_USER') {
        setCollision({
          existingUserId: err.responseBody.existingUserId!,
          existingUserName: err.responseBody.existingUserName!,
          existingUserEmail: err.responseBody.existingUserEmail || '',
        });
        return;
      }
      setError(err.message || 'Failed to save participant');
    },
  });

  // PUT against /api/admin/users/[id] — used when editing an existing guest participant from this page.
  const editGuestMutation = useMutation({
    mutationFn: async (payload: {
      participantId: string;
      name: string;
      ageNum: number;
      sex: 'M' | 'F';
      bodyweightNum: number;
    }) => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - payload.ageNum;
      const dateOfBirth = new Date(birthYear, 0, 1);
      return api.put(`/api/admin/users/${payload.participantId}`, {
        name: payload.name,
        bodyweight: payload.bodyweightNum,
        dateOfBirth: dateOfBirth.toISOString(),
        sex: payload.sex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
      closeAddModal();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update participant');
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) =>
      api.delete(`/api/admin/events/${eventId}/participants/${participantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.leaderboard(eventId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.competitionVerification(eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.public.leaderboard(eventId) });
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'orphaned-scores'] });
      setParticipantToRemove(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to remove participant');
      setParticipantToRemove(null);
    },
  });

  const deleteScoreMutation = useMutation({
    mutationFn: (scoreId: string) => api.delete(`/api/scores/${scoreId}`),
    onSuccess: async () => {
      if (selectedParticipant) {
        const scoresData = await api.get(
          `/api/events/${eventId}/participants/${selectedParticipant.id}/scores`,
        );
        setParticipantScores(scoresData.scores || []);
      }
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'orphaned-scores'] });
      setShowDeleteConfirmModal(false);
      setScoreToDelete(null);
    },
    onError: (err: Error) => {
      console.error('Error deleting score:', err);
      setError(err.message || 'Failed to delete score');
      setShowDeleteConfirmModal(false);
      setScoreToDelete(null);
    },
  });

  const assignTeamMutation = useMutation({
    mutationFn: ({ participantId, teamId }: { participantId: string; teamId: string }) =>
      api.post(`/api/events/${eventId}/assign-team`, {
        competitorId: participantId,
        teamId: teamId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
    },
    onError: (err: Error) => {
      console.error('Error assigning team:', err);
      setError(err.message || 'Failed to assign team');
    },
    onSettled: () => {
      setAssigningTeam(null);
    },
  });

  // --- Handlers ---

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingParticipant(null);
    setAddMode('existing');
    setExistingSearch('');
    setSelectedExistingUserId(null);
    setCollision(null);
    setName('');
    setEmail('');
    setAge('');
    setSex('M');
    setBodyweight('');
    setError('');
  };

  const handleSubmitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !age || !sex || !bodyweight) {
      setError('Name, age, sex, and bodyweight are required');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const ageNum = Number(age);
    const bodyweightNum = Number(bodyweight);

    if (isNaN(ageNum) || ageNum < 1 || ageNum > 100) {
      setError('Age must be between 1 and 100');
      return;
    }

    if (isNaN(bodyweightNum) || bodyweightNum <= 40 || bodyweightNum > 250) {
      setError('Bodyweight must be between 40 and 500 kg');
      return;
    }

    if (editingParticipant) {
      editGuestMutation.mutate({
        participantId: editingParticipant.id,
        name,
        ageNum,
        sex,
        bodyweightNum,
      });
      return;
    }

    addParticipantMutation.mutate({
      mode: 'guest',
      name,
      email: trimmedEmail,
      ageNum,
      sex,
      bodyweightNum,
    });
  };

  const handleAddExistingUser = (userId: string) => {
    setError('');
    addParticipantMutation.mutate({ mode: 'existing', userId });
  };

  const handleConfirmCollision = () => {
    if (!collision) return;
    setError('');
    addParticipantMutation.mutate({ mode: 'existing', userId: collision.existingUserId });
  };

  const handleEditGuest = (participant: Participant) => {
    if (!participant.isGuest) return;

    setEditingParticipant(participant);
    setAddMode('guest');
    setName(participant.name);
    setEmail(
      participant.email && !participant.email.endsWith('@temp.local') ? participant.email : '',
    );
    setAge(participant.age?.toString() || '');
    setSex(participant.sex || 'M');
    setBodyweight(participant.bodyweight?.toString() || '');
    setShowAddModal(true);
  };

  const handleRemoveParticipant = (participant: Participant) => {
    setParticipantToRemove(participant);
  };

  const handleViewScores = async (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowScoresModal(true);
    setIsLoadingScores(true);
    setError('');

    try {
      const scoresData = await api.get(
        `/api/events/${eventId}/participants/${participant.id}/scores`,
      );
      setParticipantScores(scoresData.scores || []);
    } catch (err: unknown) {
      console.error('Error fetching scores:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scores';
      setError(errorMessage);
      setParticipantScores([]);
    } finally {
      setIsLoadingScores(false);
    }
  };

  const handleDeleteScore = (score: Score) => {
    setScoreToDelete(score);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteScore = () => {
    if (!scoreToDelete) return;
    deleteScoreMutation.mutate(scoreToDelete.id);
  };

  const formatDate = (date: unknown): string => {
    if (!date) return 'N/A';
    try {
      let dateObj: Date;
      if (typeof date === 'object' && date !== null) {
        if ('seconds' in date && typeof date.seconds === 'number') {
          dateObj = new Date(date.seconds * 1000);
        } else if ('toDate' in date && typeof date.toDate === 'function') {
          dateObj = (date as { toDate: () => Date }).toDate();
        } else {
          return 'N/A';
        }
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'N/A';
      }
      return dateObj.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const handleAssignTeam = (participantId: string, teamId: string) => {
    setAssigningTeam(participantId);
    assignTeamMutation.mutate({ participantId, teamId });
  };

  const regularParticipants = participants.filter((p) => !p.isGuest);
  const guestParticipants = participants.filter((p) => p.isGuest);

  const removeConfirmMessage = (() => {
    if (!participantToRemove) return '';
    if (participantToRemove.isGuest) {
      return `Remove guest "${participantToRemove.name}" from this event? Their guest profile will be deleted.`;
    }
    return `Remove "${participantToRemove.name}" from this event? All their scores for this event will be permanently deleted. The user's account is preserved. (Note: team memberships are not modified.)`;
  })();

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <WelcomeSection showMetrics={true} isLoading={isLoading} />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push('/admin/events')}
                className="text-muted hover:text-text-secondary text-sm"
              >
                Manage Events
              </button>
              <span className="text-muted">/</span>
              <Link
                href={`/admin/events/${eventId}`}
                className="text-muted hover:text-text-secondary text-sm"
              >
                Event Details
              </Link>
              <span className="text-muted">/</span>
              <span className="text-text-primary text-sm font-medium">Participants</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {event?.name ? `Participants - ${event.name}` : 'Participants'}
                </h1>
                <p className="mt-2 text-muted">Manage participants for this event</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/public/leaderboard/${eventId}`}
                  target="_blank"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  View Leaderboard
                </Link>
                <button
                  onClick={() => setShowScoreModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Add Score
                </button>
                <button
                  onClick={() => {
                    setAddMode('existing');
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Add Participant
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Participants List */}
          <div className="space-y-6">
            {/* Regular Participants */}
            {regularParticipants.length > 0 && (
              <div className="panel rounded-2xl  p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Registered Participants ({regularParticipants.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-high">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Age
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Sex
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Bodyweight
                        </th>
                        {event?.isTeamEvent && (
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Team
                          </th>
                        )}
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {regularParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="border-b border-surface-high/50 hover:bg-surface-high/30"
                        >
                          <td className="py-3 px-4 text-white">{participant.name}</td>
                          <td className="py-3 px-4 text-muted">{participant.email || 'N/A'}</td>
                          <td className="py-3 px-4 text-muted">{participant.age || 'N/A'}</td>
                          <td className="py-3 px-4 text-muted">{participant.sex || 'N/A'}</td>
                          <td className="py-3 px-4 text-muted">
                            {participant.bodyweight ? `${participant.bodyweight} kg` : 'N/A'}
                          </td>
                          {event?.isTeamEvent && (
                            <td className="py-3 px-4">
                              <select
                                value={participant.teamId || ''}
                                onChange={(e) => {
                                  const newTeamId = e.target.value;
                                  if (newTeamId !== participant.teamId) {
                                    handleAssignTeam(participant.id, newTeamId);
                                  }
                                }}
                                disabled={assigningTeam === participant.id}
                                aria-label="Assign team"
                                className="text-sm bg-surface-high border border-border rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 min-w-[150px]"
                              >
                                <option value="">
                                  {assigningTeam === participant.id ? 'Updating...' : 'No team'}
                                </option>
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleViewScores(participant)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View Scores
                              </button>
                              <button
                                onClick={() => setShowScoreModal(true)}
                                className="text-orange-400 hover:text-orange-300 text-sm"
                              >
                                Add Score
                              </button>
                              <button
                                onClick={() => handleRemoveParticipant(participant)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Guest Participants */}
            <div className="panel rounded-2xl  p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Guest Participants ({guestParticipants.length})
                </h2>
              </div>
              {guestParticipants.length === 0 ? (
                <p className="text-muted text-center py-8">
                  No guest participants yet. Click "Add Participant" to add one.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-high">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Age
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Sex
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Bodyweight
                        </th>
                        {event?.isTeamEvent && (
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Team
                          </th>
                        )}
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="border-b border-surface-high/50 hover:bg-surface-high/30"
                        >
                          <td className="py-3 px-4 text-white">{participant.name}</td>
                          <td className="py-3 px-4 text-muted">{participant.age || 'N/A'}</td>
                          <td className="py-3 px-4 text-muted">{participant.sex || 'N/A'}</td>
                          <td className="py-3 px-4 text-muted">
                            {participant.bodyweight ? `${participant.bodyweight} kg` : 'N/A'}
                          </td>
                          {event?.isTeamEvent && (
                            <td className="py-3 px-4">
                              <select
                                value={participant.teamId || ''}
                                onChange={(e) => {
                                  const newTeamId = e.target.value;
                                  if (newTeamId !== participant.teamId) {
                                    handleAssignTeam(participant.id, newTeamId);
                                  }
                                }}
                                disabled={assigningTeam === participant.id}
                                aria-label="Assign team"
                                className="text-sm bg-surface-high border border-border rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 min-w-[150px]"
                              >
                                <option value="">
                                  {assigningTeam === participant.id ? 'Updating...' : 'No team'}
                                </option>
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleViewScores(participant)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View Scores
                              </button>
                              <button
                                onClick={() => setShowScoreModal(true)}
                                className="text-orange-400 hover:text-orange-300 text-sm"
                              >
                                Score
                              </button>
                              <button
                                onClick={() => handleEditGuest(participant)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveParticipant(participant)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Orphaned Scores (from deleted users) */}
            {orphanedScores.length > 0 && (
              <div className="panel rounded-2xl  p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Orphaned Scores ({orphanedScores.length})
                    </h2>
                    <p className="text-sm text-muted mt-1">
                      Scores from deleted users. These appear as "Unknown User" on the leaderboard.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: ['events', eventId, 'orphaned-scores'],
                      })
                    }
                    disabled={isLoadingOrphanedScores}
                    className="px-3 py-1 text-sm bg-surface-high text-white rounded-lg hover:bg-surface-high transition-colors disabled:opacity-50"
                  >
                    {isLoadingOrphanedScores ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-high">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Activity
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Raw Value
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Calculated Score
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Submitted
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphanedScores.map((score) => (
                        <tr
                          key={score.id}
                          className="border-b border-surface-high/50 hover:bg-surface-high/30"
                        >
                          <td className="py-3 px-4 text-white">{score.activityName}</td>
                          <td className="py-3 px-4 text-muted">
                            {score.rawValue}
                            {score.activityUnit && ` ${score.activityUnit}`}
                            {score.reps && ` (${score.reps} reps)`}
                          </td>
                          <td className="py-3 px-4 text-muted">{score.calculatedScore}</td>
                          <td className="py-3 px-4 text-muted">{formatDate(score.submittedAt)}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteScore(score)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Add/Edit Participant Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-surface-low rounded-2xl border border-surface-high p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {editingParticipant ? 'Edit Guest Participant' : 'Add Participant'}
                </h2>

                {/* Tabs — only when adding (not editing) */}
                {!editingParticipant && (
                  <div className="flex mb-4 border-b border-surface-high">
                    <button
                      type="button"
                      onClick={() => {
                        setAddMode('existing');
                        setCollision(null);
                        setError('');
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        addMode === 'existing'
                          ? 'border-orange-500 text-white'
                          : 'border-transparent text-muted hover:text-text-secondary'
                      }`}
                    >
                      Existing user
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMode('guest');
                        setCollision(null);
                        setError('');
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        addMode === 'guest'
                          ? 'border-orange-500 text-white'
                          : 'border-transparent text-muted hover:text-text-secondary'
                      }`}
                    >
                      Guest
                    </button>
                  </div>
                )}

                {/* Collision confirm panel */}
                {collision && (
                  <div className="mb-4 bg-orange-900/30 border border-orange-700/50 rounded-lg p-4">
                    <p className="text-orange-200 text-sm mb-3">
                      An account already exists for <strong>{collision.existingUserName}</strong>
                      {collision.existingUserEmail ? ` (${collision.existingUserEmail})` : ''}. Add
                      them as a participant?
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCollision(null)}
                        className="px-3 py-1 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCollision}
                        disabled={addParticipantMutation.isPending}
                        className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                      >
                        {addParticipantMutation.isPending ? 'Adding...' : 'Yes, add them'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing user tab */}
                {!editingParticipant && !collision && addMode === 'existing' && (
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="existing-search"
                        className="block text-sm font-medium text-text-secondary mb-1"
                      >
                        Search by name or email
                      </label>
                      <input
                        type="text"
                        id="existing-search"
                        autoComplete="off"
                        className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={existingSearch}
                        onChange={(e) => setExistingSearch(e.target.value)}
                        placeholder="Start typing..."
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-surface-high rounded-lg">
                      {adminUsersQuery.isLoading ? (
                        <p className="text-muted text-sm p-3">Loading users...</p>
                      ) : filteredExistingUsers.length === 0 ? (
                        <p className="text-muted text-sm p-3">
                          {existingSearch
                            ? 'No matching users (already-participating users are hidden).'
                            : 'No eligible users found.'}
                        </p>
                      ) : (
                        <ul>
                          {filteredExistingUsers.map((u) => (
                            <li
                              key={u.id}
                              className={`flex items-center justify-between px-3 py-2 border-b border-surface-high/50 ${
                                selectedExistingUserId === u.id ? 'bg-surface-high/50' : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedExistingUserId(u.id)}
                                className="flex-1 text-left"
                              >
                                <p className="text-sm text-white">{u.name}</p>
                                <p className="text-xs text-muted">{u.email}</p>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddExistingUser(u.id)}
                                disabled={addParticipantMutation.isPending}
                                className="ml-3 px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                              >
                                Add
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {error && (
                      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={closeAddModal}
                        className="px-4 py-2 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Guest tab (or edit-guest form) */}
                {(editingParticipant || addMode === 'guest') && !collision && (
                  <form onSubmit={handleSubmitGuest} className="space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-text-secondary mb-1"
                      >
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-text-secondary mb-1"
                      >
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        id="email"
                        placeholder="competitor@example.com"
                        disabled={!!editingParticipant}
                        className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      {!editingParticipant && (
                        <p className="mt-1 text-xs text-text-secondary">
                          If provided, we&apos;ll email them a welcome and they can register later
                          to claim their scores. If the email matches an existing account,
                          we&apos;ll offer to add the registered user instead.
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="age"
                        className="block text-sm font-medium text-text-secondary mb-1"
                      >
                        Age *
                      </label>
                      <input
                        type="number"
                        id="age"
                        required
                        min="1"
                        max="120"
                        className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sex"
                        className="block text-sm font-medium text-text-secondary mb-1"
                      >
                        Sex *
                      </label>
                      <select
                        id="sex"
                        required
                        aria-label="Sex"
                        className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={sex}
                        onChange={(e) => setSex(e.target.value as 'M' | 'F')}
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="bodyweight"
                        className="block text-sm font-medium text-text-secondary mb-1"
                      >
                        Bodyweight (kg) *
                      </label>
                      <input
                        type="number"
                        id="bodyweight"
                        required
                        min="0"
                        max="500"
                        step="0.1"
                        className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={bodyweight}
                        onChange={(e) => setBodyweight(e.target.value)}
                      />
                    </div>
                    {error && (
                      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={closeAddModal}
                        className="px-4 py-2 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addParticipantMutation.isPending || editGuestMutation.isPending}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        {addParticipantMutation.isPending || editGuestMutation.isPending
                          ? 'Saving...'
                          : editingParticipant
                            ? 'Update'
                            : 'Add'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Score Submission Modal */}
          <ScoreSubmissionModal
            eventId={eventId}
            isOpen={showScoreModal}
            onClose={() => setShowScoreModal(false)}
            onScoreSubmitted={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
            }}
          />

          {/* View Scores Modal */}
          {showScoresModal && selectedParticipant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-surface-low rounded-2xl border border-surface-high p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Scores for {selectedParticipant.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowScoresModal(false);
                      setSelectedParticipant(null);
                      setParticipantScores([]);
                    }}
                    className="text-muted hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                {isLoadingScores ? (
                  <div className="text-center py-8">
                    <p className="text-muted">Loading scores...</p>
                  </div>
                ) : participantScores.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted">No scores found for this participant.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-surface-high">
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Activity
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Raw Value
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Calculated Score
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Submitted
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantScores.map((score) => (
                          <tr
                            key={score.id}
                            className="border-b border-surface-high/50 hover:bg-surface-high/30"
                          >
                            <td className="py-3 px-4 text-white">{score.activityName}</td>
                            <td className="py-3 px-4 text-muted">
                              {score.rawValue}
                              {score.activityUnit && ` ${score.activityUnit}`}
                              {score.reps && ` (${score.reps} reps)`}
                            </td>
                            <td className="py-3 px-4 text-muted">
                              {score.calculatedScore.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-muted">
                              {formatDate(score.submittedAt)}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleDeleteScore(score)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remove Participant Confirmation Modal */}
          <ConfirmModal
            isOpen={!!participantToRemove}
            title="Remove Participant"
            message={removeConfirmMessage}
            confirmText="Remove"
            cancelText="Cancel"
            isDestructive={true}
            onConfirm={() => {
              if (participantToRemove) {
                removeParticipantMutation.mutate(participantToRemove.id);
              }
            }}
            onCancel={() => setParticipantToRemove(null)}
          />

          {/* Delete Score Confirmation Modal */}
          <ConfirmModal
            isOpen={showDeleteConfirmModal}
            title="Delete Score"
            message={
              scoreToDelete
                ? `Are you sure you want to delete the score for "${scoreToDelete.activityName}"? This action cannot be undone.`
                : 'Are you sure you want to delete this score?'
            }
            confirmText="Delete"
            cancelText="Cancel"
            isDestructive={true}
            onConfirm={confirmDeleteScore}
            onCancel={() => {
              setShowDeleteConfirmModal(false);
              setScoreToDelete(null);
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
