'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api-client';
import { queryKeys } from '@lib/queryKeys';
import { calculateAgeFromDateOfBirth, convertFirestoreTimestamp } from '@lib/utils';
import { SCORING_SYSTEMS } from '@constants/scoringSystems';
import { parseTimeWithMilliseconds } from '@utils/scoring';
import { FiX, FiCheckCircle } from 'react-icons/fi';

function dobToInputValue(raw: unknown): string {
  const d = convertFirestoreTimestamp(raw);
  if (!d) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface Activity {
  id: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  unit?: string;
  scoringSystemId?: string;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  bodyweight?: number;
  dateOfBirth?: Date;
  sex?: 'M' | 'F';
  isGuest?: boolean;
  age?: number;
}

interface CompetitionVerification {
  id: string;
  userId: string;
  eventId: string;
  bodyweight: number;
  verifiedBy: string;
  verifiedAt: unknown;
  verificationNotes?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface ScoreSubmissionModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onScoreSubmitted: () => void;
}

export default function ScoreSubmissionModal({
  eventId,
  isOpen,
  onClose,
  onScoreSubmitted,
}: ScoreSubmissionModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [scoreValue, setScoreValue] = useState('');
  const [notes, setNotes] = useState('');
  const [competitorDetails, setCompetitorDetails] = useState<Participant | null>(null);
  const [competitionVerification, setCompetitionVerification] =
    useState<CompetitionVerification | null>(null);

  // Team selection state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [competitorHasTeam, setCompetitorHasTeam] = useState(false);
  const [competitorTeamId, setCompetitorTeamId] = useState<string | null>(null);

  // Competitor autocomplete state
  const [competitorQuery, setCompetitorQuery] = useState('');
  const [isCompetitorListOpen, setIsCompetitorListOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const competitorWrapperRef = useRef<HTMLDivElement>(null);

  // Inline edit-competitor state — admins can fix scoring-relevant fields without leaving the modal.
  const queryClient = useQueryClient();
  const [isEditingCompetitor, setIsEditingCompetitor] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBodyweight, setEditBodyweight] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editSex, setEditSex] = useState<'' | 'M' | 'F'>('');
  const [isSavingCompetitor, setIsSavingCompetitor] = useState(false);
  const [editError, setEditError] = useState('');

  const getParticipantLabel = useCallback((participant: Participant): string => {
    if (participant.isGuest) {
      const stats = [
        participant.age ? `${participant.age}yo` : null,
        participant.sex || null,
        participant.bodyweight ? `${participant.bodyweight}kg` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `${participant.name}${stats ? ` (${stats})` : ''}`;
    }
    return `${participant.name}${participant.email ? ` (${participant.email})` : ''}`;
  }, []);

  const sortedParticipants = useMemo(
    () =>
      [...participants].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [participants],
  );

  const filteredParticipants = useMemo(() => {
    const q = competitorQuery.trim().toLowerCase();
    if (!q) return sortedParticipants;
    return sortedParticipants.filter((p) => getParticipantLabel(p).toLowerCase().includes(q));
  }, [sortedParticipants, competitorQuery, getParticipantLabel]);

  const fetchEventData = useCallback(async () => {
    try {
      const [eventData, activitiesData] = await Promise.all([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/events/${eventId}/activities`),
      ]);

      setParticipants(eventData.participants || []);
      setActivities(activitiesData);
      setIsTeamEvent(eventData.isTeamEvent || false);

      // Fetch teams if event supports teams
      if (eventData.isTeamEvent) {
        try {
          const teamsData = await api.get('/api/teams/all');
          const allTeams = [...(teamsData.userTeams || []), ...(teamsData.availableTeams || [])];
          setTeams(allTeams);
        } catch (error) {
          console.error('Error fetching teams:', error);
          // Don't show error, just log it - teams are optional
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching event data:', error);
      setError('Failed to fetch event data');
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen) {
      fetchEventData();
    } else {
      // Reset form state when modal closes
      setSelectedCompetitor('');
      setSelectedActivity('');
      setScoreValue('');
      setNotes('');
      setSelectedTeamId('');
      setCompetitorDetails(null);
      setCompetitionVerification(null);
      setCompetitorHasTeam(false);
      setCompetitorTeamId(null);
      setCompetitorQuery('');
      setIsCompetitorListOpen(false);
      setHighlightedIndex(-1);
      setError('');
      setIsEditingCompetitor(false);
      setEditError('');
    }
  }, [isOpen, eventId, fetchEventData]);

  // Close competitor dropdown when clicking outside
  useEffect(() => {
    if (!isCompetitorListOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        competitorWrapperRef.current &&
        !competitorWrapperRef.current.contains(event.target as Node)
      ) {
        setIsCompetitorListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCompetitorListOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompetitor || !selectedActivity || !scoreValue) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Parse the score value based on input type
      let rawValue: number;
      if (isTimeInput()) {
        rawValue = parseTimeInput(scoreValue);
      } else {
        rawValue = Number(scoreValue);
      }

      await api.post('/api/scores', {
        eventId,
        competitorId: selectedCompetitor,
        activityId: selectedActivity,
        rawValue,
        notes,
        teamId: selectedTeamId || undefined, // Only include if a team is selected
      });

      // Reset form
      setSelectedCompetitor('');
      setSelectedActivity('');
      setScoreValue('');
      setNotes('');
      setSelectedTeamId('');
      setCompetitorHasTeam(false);
      setCompetitorTeamId(null);
      setCompetitorQuery('');
      setIsCompetitorListOpen(false);
      setHighlightedIndex(-1);

      onScoreSubmitted();
      onClose();
    } catch (error: unknown) {
      console.error('Error submitting score:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit score';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityUnit = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);

    // If activity has a unit, use it
    if (activity?.unit) {
      return activity.unit;
    }

    // Fallback: get unit from scoring system
    if (activity?.scoringSystemId) {
      const scoringSystem = SCORING_SYSTEMS.find((sys) => sys.id === activity.scoringSystemId);
      return scoringSystem?.unit || '';
    }

    return '';
  };

  const getSelectedActivity = () => {
    return activities.find((a) => a.id === selectedActivity);
  };

  const isTimeInput = () => {
    const activity = getSelectedActivity();
    return activity?.unit === 'seconds';
  };

  const isWeightInput = () => {
    const activity = getSelectedActivity();
    return activity?.unit === 'kg';
  };

  const parseTimeInput = (timeStr: string): number => {
    return parseTimeWithMilliseconds(timeStr);
  };

  const handleCompetitorChange = async (competitorId: string) => {
    setSelectedCompetitor(competitorId);
    const competitor = participants.find((p) => p.id === competitorId);
    setCompetitorDetails(competitor || null);
    setSelectedTeamId(''); // Reset team selection when competitor changes
    setIsEditingCompetitor(false);
    setEditError('');

    // Fetch competition verification data if competitor is selected
    if (competitorId) {
      try {
        const verificationData = await api.get(`/api/events/${eventId}/competition-verification`);
        const verification = verificationData.verifications?.find(
          (v: CompetitionVerification) => v.userId === competitorId,
        );
        setCompetitionVerification(verification || null);
      } catch (error) {
        console.error('Error fetching competition verification:', error);
        setCompetitionVerification(null);
      }

      // Check if competitor already has a team for this event
      if (isTeamEvent) {
        try {
          // Use a custom endpoint or check participation
          // For now, we'll check via the participants data or create an endpoint
          // Since we don't have direct access, we'll assume they might have a team
          // and let the API handle it, but we can try to fetch participation info
          const participationResponse = await api
            .get(`/api/events/${eventId}/participants/${competitorId}/participation`)
            .catch(() => null);

          if (participationResponse?.participation?.teamId) {
            setCompetitorHasTeam(true);
            setCompetitorTeamId(participationResponse.participation.teamId);
          } else {
            setCompetitorHasTeam(false);
            setCompetitorTeamId(null);
          }
        } catch (_error) {
          // If endpoint doesn't exist or fails, assume no team
          setCompetitorHasTeam(false);
          setCompetitorTeamId(null);
        }
      }
    } else {
      setCompetitionVerification(null);
      setCompetitorHasTeam(false);
      setCompetitorTeamId(null);
    }
  };

  const handleCompetitorSelect = (participant: Participant) => {
    setCompetitorQuery(getParticipantLabel(participant));
    setIsCompetitorListOpen(false);
    setHighlightedIndex(-1);
    handleCompetitorChange(participant.id);
  };

  const handleCompetitorQueryChange = (value: string) => {
    setCompetitorQuery(value);
    setIsCompetitorListOpen(true);
    setHighlightedIndex(-1);
    if (selectedCompetitor) {
      handleCompetitorChange('');
    }
  };

  const handleCompetitorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isCompetitorListOpen) setIsCompetitorListOpen(true);
      setHighlightedIndex((prev) =>
        filteredParticipants.length === 0 ? -1 : (prev + 1) % filteredParticipants.length,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isCompetitorListOpen) setIsCompetitorListOpen(true);
      setHighlightedIndex((prev) =>
        filteredParticipants.length === 0
          ? -1
          : (prev - 1 + filteredParticipants.length) % filteredParticipants.length,
      );
    } else if (e.key === 'Enter') {
      if (isCompetitorListOpen && highlightedIndex >= 0) {
        e.preventDefault();
        const participant = filteredParticipants[highlightedIndex];
        if (participant) handleCompetitorSelect(participant);
      }
    } else if (e.key === 'Escape') {
      if (isCompetitorListOpen) {
        e.preventDefault();
        setIsCompetitorListOpen(false);
      }
    }
  };

  const openCompetitorEdit = () => {
    if (!competitorDetails) return;
    setEditName(competitorDetails.name || '');
    setEditBodyweight(competitorDetails.bodyweight ? String(competitorDetails.bodyweight) : '');
    setEditDob(dobToInputValue(competitorDetails.dateOfBirth));
    setEditSex(competitorDetails.sex || '');
    setEditError('');
    setIsEditingCompetitor(true);
  };

  const saveCompetitorEdit = async () => {
    if (!competitorDetails) return;
    setEditError('');

    const trimmedName = editName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      setEditError('Name must be 1-100 characters');
      return;
    }
    const payload: Record<string, unknown> = { name: trimmedName };
    if (editBodyweight !== '') {
      const bw = Number(editBodyweight);
      if (!Number.isFinite(bw) || bw <= 0 || bw > 500) {
        setEditError('Bodyweight must be between 0 and 500 kg');
        return;
      }
      payload.bodyweight = bw;
    }
    if (editDob !== '') {
      const d = new Date(`${editDob}T00:00:00.000Z`);
      if (isNaN(d.getTime())) {
        setEditError('Invalid date of birth');
        return;
      }
      payload.dateOfBirth = d.toISOString();
    }
    if (editSex !== '') {
      payload.sex = editSex;
    }

    setIsSavingCompetitor(true);
    try {
      await api.put(`/api/admin/users/${competitorDetails.id}`, payload);

      const updatedDob =
        editDob !== '' ? new Date(`${editDob}T00:00:00.000Z`) : competitorDetails.dateOfBirth;
      const updatedDetails: Participant = {
        ...competitorDetails,
        name: trimmedName,
        bodyweight: editBodyweight !== '' ? Number(editBodyweight) : competitorDetails.bodyweight,
        dateOfBirth: updatedDob as Date | undefined,
        sex: editSex !== '' ? (editSex as 'M' | 'F') : competitorDetails.sex,
        age:
          editDob !== ''
            ? calculateAgeFromDateOfBirth(new Date(`${editDob}T00:00:00.000Z`)) || undefined
            : competitorDetails.age,
      };
      setCompetitorDetails(updatedDetails);
      setParticipants((prev) =>
        prev.map((p) => (p.id === updatedDetails.id ? { ...p, ...updatedDetails } : p)),
      );
      setCompetitorQuery(getParticipantLabel(updatedDetails));

      queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.competitionVerification(eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.leaderboard(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.public.leaderboard(eventId) });

      setIsEditingCompetitor(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save competitor';
      setEditError(msg);
    } finally {
      setIsSavingCompetitor(false);
    }
  };

  const handleScoreChange = (value: string) => {
    if (isTimeInput()) {
      // For time input, allow mm:ss.ms format (e.g., "1:26.3") or ss.ms format (e.g., "86.3")
      // Allow digits, colons, and one decimal point
      const timeRegex = /^[0-9]*:?[0-9]*\.?[0-9]*$/;
      if (timeRegex.test(value) || value === '') {
        setScoreValue(value);
      }
    } else {
      // For other inputs, only allow numbers
      setScoreValue(value.replace(/[^0-9.]/g, ''));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Submit score"
        className="panel rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-white text-xl font-bold">Submit Score</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="competitor"
              className="block text-text-secondary text-sm font-medium mb-2"
            >
              Competitor *
            </label>
            <div ref={competitorWrapperRef} className="relative">
              <input
                id="competitor"
                type="text"
                value={competitorQuery}
                onChange={(e) => handleCompetitorQueryChange(e.target.value)}
                onFocus={() => setIsCompetitorListOpen(true)}
                onKeyDown={handleCompetitorKeyDown}
                placeholder="Search competitor by name..."
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isCompetitorListOpen}
                aria-controls="competitor-listbox"
                aria-activedescendant={
                  highlightedIndex >= 0 && filteredParticipants[highlightedIndex]
                    ? `competitor-option-${filteredParticipants[highlightedIndex].id}`
                    : undefined
                }
                className="w-full px-4 py-3 bg-surface-high border border-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {isCompetitorListOpen && (
                <ul
                  id="competitor-listbox"
                  role="listbox"
                  className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-surface-high border border-border rounded-lg shadow-lg"
                >
                  {filteredParticipants.length === 0 ? (
                    <li className="px-4 py-2 text-muted text-sm">No competitors found</li>
                  ) : (
                    filteredParticipants.map((participant, index) => {
                      const label = getParticipantLabel(participant);
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <li
                          key={participant.id}
                          id={`competitor-option-${participant.id}`}
                          role="option"
                          aria-selected={isHighlighted}
                          onMouseDown={(e) => {
                            // Prevent input blur before click registers
                            e.preventDefault();
                            handleCompetitorSelect(participant);
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`px-4 py-2 text-white cursor-pointer ${
                            isHighlighted ? 'bg-orange-500/20' : 'hover:bg-orange-500/10'
                          }`}
                        >
                          {label}
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Competitor Details */}
          {competitorDetails && (
            <div className="bg-surface-high/50 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">Competitor Details</h4>
                {!isEditingCompetitor && (
                  <button
                    type="button"
                    onClick={openCompetitorEdit}
                    className="text-xs text-orange-400 hover:text-orange-300"
                  >
                    Edit details
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted">Profile Weight:</span>
                  <span className="ml-1 text-white">
                    {competitorDetails.bodyweight ? `${competitorDetails.bodyweight}kg` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Competition Weight:</span>
                  <span
                    className={`ml-1 ${competitionVerification?.status === 'VERIFIED' ? 'text-green-400 font-medium' : 'text-white'}`}
                  >
                    {competitionVerification?.status === 'VERIFIED'
                      ? `${competitionVerification.bodyweight}kg`
                      : 'Not weighed in'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Age:</span>
                  <span className="ml-1 text-white">
                    {competitorDetails.isGuest && competitorDetails.age
                      ? competitorDetails.age
                      : competitorDetails.dateOfBirth
                        ? (() => {
                            const birthDate = convertFirestoreTimestamp(
                              competitorDetails.dateOfBirth,
                            );
                            const calculatedAge = birthDate
                              ? calculateAgeFromDateOfBirth(birthDate)
                              : null;
                            return calculatedAge || 'Not set';
                          })()
                        : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Sex:</span>
                  <span className="ml-1 text-white">{competitorDetails.sex || 'Not set'}</span>
                </div>
              </div>
              {isEditingCompetitor && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div>
                    <label htmlFor="edit-name" className="block text-xs text-text-secondary mb-1">
                      Name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface-high border border-border rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-bw" className="block text-xs text-text-secondary mb-1">
                      Bodyweight (kg)
                    </label>
                    <input
                      id="edit-bw"
                      type="number"
                      min="0"
                      max="500"
                      step="0.1"
                      value={editBodyweight}
                      onChange={(e) => setEditBodyweight(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface-high border border-border rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-dob" className="block text-xs text-text-secondary mb-1">
                      Date of birth
                    </label>
                    <input
                      id="edit-dob"
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface-high border border-border rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-sex" className="block text-xs text-text-secondary mb-1">
                      Sex
                    </label>
                    <select
                      id="edit-sex"
                      value={editSex}
                      onChange={(e) => setEditSex(e.target.value as '' | 'M' | 'F')}
                      className="w-full px-2 py-1 text-xs bg-surface-high border border-border rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">(unset)</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  {editError && <p className="text-xs text-red-400">{editError}</p>}
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCompetitor(false);
                        setEditError('');
                      }}
                      disabled={isSavingCompetitor}
                      className="px-2 py-1 text-xs bg-surface-high text-text-secondary rounded hover:bg-surface-high transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveCompetitorEdit}
                      disabled={isSavingCompetitor}
                      className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {isSavingCompetitor ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
              {competitionVerification?.status === 'VERIFIED' && (
                <p className="text-xs text-green-400 mt-1">
                  ✅ Score will be calculated using competition weight (
                  {competitionVerification.bodyweight}kg)
                </p>
              )}
              {(!competitorDetails.bodyweight ||
                !competitorDetails.dateOfBirth ||
                !competitorDetails.sex) && (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ Missing competitor details may affect scoring calculation
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="activity"
              className="block text-text-secondary text-sm font-medium mb-2"
            >
              Workout *
            </label>
            <select
              id="activity"
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              required
              aria-label="Select workout"
              className="w-full px-4 py-3 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select a workout</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="score" className="block text-text-secondary text-sm font-medium mb-2">
              Score *
              {selectedActivity && (
                <span className="text-xs text-muted ml-1">
                  ({getActivityUnit(selectedActivity)})
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={isTimeInput() ? 'text' : 'number'}
                id="score"
                value={scoreValue}
                onChange={(e) => handleScoreChange(e.target.value)}
                required
                step={isTimeInput() ? undefined : '0.01'}
                className="w-full px-4 py-3 bg-surface-high border border-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={
                  isTimeInput()
                    ? 'Enter time (e.g., 2:30 or 150)'
                    : isWeightInput()
                      ? 'Enter weight in kg'
                      : 'Enter score'
                }
              />
              {selectedActivity && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-muted font-medium">
                    {getActivityUnit(selectedActivity)}
                  </span>
                </div>
              )}
            </div>
            {selectedActivity && (
              <p className="mt-1 text-xs text-muted">
                {isTimeInput()
                  ? 'Enter time as mm:ss (e.g., 2:30) or seconds (e.g., 150)'
                  : isWeightInput()
                    ? `Enter weight in ${getActivityUnit(selectedActivity)}`
                    : `Enter score in ${getActivityUnit(selectedActivity)}`}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-text-secondary text-sm font-medium mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-surface-high border border-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Add any notes about this score..."
            />
          </div>

          {/* Team Selection - Only show if event supports teams and competitor doesn't have a team */}
          {isTeamEvent && selectedCompetitor && !competitorHasTeam && teams.length > 0 && (
            <div>
              <label htmlFor="team" className="block text-text-secondary text-sm font-medium mb-2">
                Assign Team (Optional)
                <span className="text-xs text-muted ml-1">- Admin only</span>
              </label>
              <select
                id="team"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                aria-label="Assign team"
                className="w-full px-4 py-3 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">No team (leave unassigned)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Select a team for this competitor. This will apply to all future scores for this
                event.
              </p>
            </div>
          )}

          {/* Show current team if competitor already has one */}
          {isTeamEvent && selectedCompetitor && competitorHasTeam && competitorTeamId && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-blue-200">
                  Competitor is already assigned to:{' '}
                  <span className="font-semibold">
                    {teams.find((t) => t.id === competitorTeamId)?.name || 'Unknown Team'}
                  </span>
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Submit Score</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
