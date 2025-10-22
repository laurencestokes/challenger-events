'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TeamErgSession, useTeamErgSocket } from '@/hooks/useTeamErgSocket';
import { Competitor } from '@/hooks/useErgSocket';
import ErgSpeedometer from '@/components/ErgSpeedometer';
import Image from 'next/image';

export default function TeamErgLiveDisplayPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<null | undefined | TeamErgSession>(null);
  const [loading, setLoading] = useState(true);

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    teamScores,
    participantUpdates,
    sessionStatus,
    error,
  } = useTeamErgSocket(sessionId);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/erg/team-sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      console.error('Error fetching team session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-2xl">Loading team competition...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Session Not Found</h2>
          <p className="text-gray-400">
            This team competition session does not exist or has ended.
          </p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'ended') {
    const teamAScore =
      teamScores.find((score) => score.teamId === session.teamA.id)?.totalScore || 0;
    const teamBScore =
      teamScores.find((score) => score.teamId === session.teamB.id)?.totalScore || 0;

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Team Competition Ended</h2>
          <p className="text-gray-400 mb-8">This session has concluded.</p>
          <div className="mt-8">
            <h3 className="text-2xl mb-6 text-yellow-400">Final Team Scores</h3>
            <div className="flex gap-12 justify-center">
              <div className="bg-blue-500/20 rounded-xl p-6">
                <p className="text-xl mb-2">{session.teamA.name}</p>
                <p className="text-5xl font-bold text-blue-400">{teamAScore.toFixed(1)}</p>
                <p className="text-sm text-gray-400 mt-2">Total Team Score</p>
              </div>
              <div className="bg-purple-500/20 rounded-xl p-6">
                <p className="text-xl mb-2">{session.teamB.name}</p>
                <p className="text-5xl font-bold text-purple-400">{teamBScore.toFixed(1)}</p>
                <p className="text-sm text-gray-400 mt-2">Total Team Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const teamAScore = teamScores.find((score) => score.teamId === session.teamA.id)?.totalScore || 0;
  const teamBScore = teamScores.find((score) => score.teamId === session.teamB.id)?.totalScore || 0;
  const activeParticipants = participantUpdates.filter(
    (update) => update.metrics.distance > 0 || update.metrics.pace > 0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      {/* Header with Logo and Beta Badge */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/challengerco-logo-text-only.png"
                alt="The Challenger Co."
                width={120}
                height={48}
                className="h-8 w-auto"
                priority
              />
            </a>
            <span className="px-3 py-1 text-xs font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span
              className={`px-4 py-2 rounded-full font-semibold ${
                isConnected
                  ? 'bg-green-500/20 text-green-400'
                  : isReconnecting
                    ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                    : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isConnected
                ? '🟢 LIVE'
                : isReconnecting
                  ? `🟡 RECONNECTING (${reconnectAttempt})`
                  : '🔴 DISCONNECTED'}
            </span>
            {activeParticipants.length === 0 && isConnected && (
              <span className="text-yellow-400 animate-pulse text-lg">
                Waiting for team members to start...
              </span>
            )}
          </div>
        </div>
        <h1 className="text-6xl font-bold text-center mb-4 tracking-wider">TEAM ERG COMPETITION</h1>
      </div>

      {/* Team Scores */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-2 gap-12">
          {/* Team A Score */}
          <div className="bg-blue-500/10 rounded-2xl p-8 border border-blue-500/30">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-blue-400 mb-4">{session.teamA.name}</h2>
              <div className="text-6xl font-bold text-blue-400 mb-4">{teamAScore.toFixed(1)}</div>
              <p className="text-gray-400">Total Team Score</p>
            </div>
          </div>

          {/* Team B Score */}
          <div className="bg-purple-500/10 rounded-2xl p-8 border border-purple-500/30">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-purple-400 mb-4">{session.teamB.name}</h2>
              <div className="text-6xl font-bold text-purple-400 mb-4">{teamBScore.toFixed(1)}</div>
              <p className="text-gray-400">Total Team Score</p>
            </div>
          </div>
        </div>

        {/* Team Leader Indicator */}
        {teamAScore > 0 || teamBScore > 0 ? (
          <div className="text-center mt-8">
            <div className="inline-block bg-yellow-500/20 text-yellow-400 px-8 py-4 rounded-full text-3xl font-bold border-2 border-yellow-500/40 shadow-lg">
              {teamAScore > teamBScore
                ? `${session.teamA.name.toUpperCase()} LEADS by ${(teamAScore - teamBScore).toFixed(1)}`
                : teamBScore > teamAScore
                  ? `${session.teamB.name.toUpperCase()} LEADS by ${(teamBScore - teamAScore).toFixed(1)}`
                  : "IT'S A TIE!"}
            </div>
          </div>
        ) : null}
      </div>

      {/* Active Participants */}
      {activeParticipants.length > 0 && (
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">Active Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeParticipants.map((participant, _index) => {
              const isTeamA = participant.teamId === session.teamA.id;
              const teamName = isTeamA ? session.teamA.name : session.teamB.name;
              const accentColor = isTeamA ? '#3b82f6' : '#a855f7';
              const textColor = isTeamA ? 'text-blue-400' : 'text-purple-400';
              const teamScore = isTeamA ? teamAScore : teamBScore;

              return (
                <div
                  key={`${participant.teamId}-${participant.participantId}`}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {participant.participantName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${isTeamA ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}
                      >
                        {teamName}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Current Score:{' '}
                      <span className="font-bold text-white">
                        {participant.calculatedScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <ErgSpeedometer
                    name={participant.participantName}
                    age={0} // We don't have age in the update
                    sex="male" // We don't have sex in the update
                    weight={0} // We don't have weight in the update
                    score={participant.calculatedScore}
                    pace={participant.metrics.pace}
                    power={participant.metrics.power}
                    distance={participant.metrics.distance}
                    heartRate={participant.metrics.heartRate}
                    strokeRate={participant.metrics.strokeRate}
                    calories={participant.metrics.calories}
                    accentColor={accentColor}
                    textColor={textColor}
                    compact={true}
                    teamScore={teamScore}
                    showTeamScore={true}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Member Status */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-12">
          {/* Team A Members */}
          <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/30">
            <h3 className="text-xl font-bold text-blue-400 mb-4">{session.teamA.name} Members</h3>
            <div className="space-y-3">
              {session.teamA.members.map((member: Competitor) => {
                const isActive = participantUpdates.some(
                  (update) =>
                    update.participantId === member.id && update.teamId === session.teamA.id,
                );
                const participantData = participantUpdates.find(
                  (update) =>
                    update.participantId === member.id && update.teamId === session.teamA.id,
                );

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-sm text-gray-400">
                        {member.age}y, {member.sex}, {member.weight}kg
                      </p>
                    </div>
                    <div className="text-right">
                      {isActive ? (
                        <div>
                          <p className="text-green-400 font-bold">ACTIVE</p>
                          <p className="text-sm text-gray-400">
                            {participantData?.calculatedScore.toFixed(1) || '0'} pts
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Waiting...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team B Members */}
          <div className="bg-purple-500/10 rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-purple-400 mb-4">{session.teamB.name} Members</h3>
            <div className="space-y-3">
              {session.teamB.members.map((member: Competitor) => {
                const isActive = participantUpdates.some(
                  (update) =>
                    update.participantId === member.id && update.teamId === session.teamB.id,
                );
                const participantData = participantUpdates.find(
                  (update) =>
                    update.participantId === member.id && update.teamId === session.teamB.id,
                );

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-sm text-gray-400">
                        {member.age}y, {member.sex}, {member.weight}kg
                      </p>
                    </div>
                    <div className="text-right">
                      {isActive ? (
                        <div>
                          <p className="text-green-400 font-bold">ACTIVE</p>
                          <p className="text-sm text-gray-400">
                            {participantData?.calculatedScore.toFixed(1) || '0'} pts
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Waiting...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8 text-center">
          <div className="inline-block bg-red-500/20 text-red-400 px-6 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
