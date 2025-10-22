const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? '*' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Store active sessions and Python client connections
  global.io = io;
  global.ergSessions = new Map(); // sessionId -> { competitor1, competitor2, pythonSocketId }
  global.pythonClients = new Map(); // socketId -> socket
  global.teamErgSessions = new Map(); // sessionId -> session data

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Python client authentication
    socket.on('python:authenticate', (data) => {
      const { apiSecret, sessionId } = data;

      if (apiSecret === process.env.ERG_API_SECRET) {
        global.pythonClients.set(socket.id, socket);
        socket.join(`python-client`);

        // Store Python client with session
        if (sessionId) {
          const session = global.ergSessions.get(sessionId);
          if (session) {
            session.pythonSocketId = socket.id;
            global.ergSessions.set(sessionId, session);
          }
        }

        socket.emit('python:authenticated', { success: true });
        console.log('Python client authenticated:', socket.id);
      } else {
        socket.emit('python:authenticated', { success: false, error: 'Invalid API secret' });
        socket.disconnect();
      }
    });

    // Admin starts a head-to-head session
    socket.on('session:start', (data) => {
      const { sessionId, competitor1, competitor2 } = data;

      global.ergSessions.set(sessionId, {
        competitor1,
        competitor2,
        pythonSocketId: null,
        startedAt: new Date().toISOString(),
      });

      socket.join(`session:${sessionId}`);

      // Notify Python client about new session
      io.to('python-client').emit('session:new', {
        sessionId,
        competitor1,
        competitor2,
      });

      console.log('Session started:', sessionId);
    });

    // Public viewer joins session
    socket.on('session:join', (sessionId) => {
      socket.join(`session:${sessionId}`);
      console.log('Viewer joined session:', sessionId);

      // Send current session data if available
      const session = global.ergSessions.get(sessionId);
      if (session) {
        socket.emit('session:data', session);
      }
    });

    // Python client sends erg data
    socket.on('erg:data', (data) => {
      const { sessionId, competitorIndex, metrics, calculatedScore } = data;

      // Broadcast to all viewers of this session
      io.to(`session:${sessionId}`).emit('erg:update', {
        competitorIndex,
        metrics,
        calculatedScore,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `Erg data for session ${sessionId}, competitor ${competitorIndex}:`,
        calculatedScore,
      );
    });

    // Admin stops session
    socket.on('session:stop', (sessionId) => {
      const session = global.ergSessions.get(sessionId);
      if (session && session.pythonSocketId) {
        // Notify Python client to disconnect from ergs
        io.to(session.pythonSocketId).emit('session:stop', { sessionId });
      }

      // Notify all viewers
      io.to(`python-client`).emit('session:stop', { sessionId });

      global.ergSessions.delete(sessionId);
      console.log('Session stopped:', sessionId);
    });

    // Team session handlers
    socket.on('team-session:start', (data) => {
      const { sessionId, teamA, teamB, sessionType } = data;

      global.teamErgSessions.set(sessionId, {
        teamA,
        teamB,
        sessionType,
        pythonSocketId: null,
        startedAt: new Date().toISOString(),
        teamScores: {
          [teamA.id]: {
            teamId: teamA.id,
            teamName: teamA.name,
            totalScore: 0,
            participantScores: (teamA.members || []).map((member) => ({
              participantId: member.id,
              participantName: member.name,
              score: 0,
              isActive: false,
            })),
          },
          [teamB.id]: {
            teamId: teamB.id,
            teamName: teamB.name,
            totalScore: 0,
            participantScores: (teamB.members || []).map((member) => ({
              participantId: member.id,
              participantName: member.name,
              score: 0,
              isActive: false,
            })),
          },
        },
      });

      socket.join(`team-session:${sessionId}`);

      // Notify Python client about new team session
      io.to('python-client').emit('team-session:new', {
        sessionId,
        teamA,
        teamB,
        sessionType,
      });

      console.log('Team session started:', sessionId);
    });

    // Public viewer joins team session
    socket.on('team-session:join', (sessionId) => {
      socket.join(`team-session:${sessionId}`);
      console.log('Viewer joined team session:', sessionId);
      console.log('Socket ID:', socket.id, 'joined room:', `team-session:${sessionId}`);

      // Send current session data if available
      const session = global.teamErgSessions.get(sessionId);
      if (session) {
        console.log('Sending session data to viewer:', sessionId);
        socket.emit('team-session:data', session);
      } else {
        console.log('No session data found for:', sessionId);
      }
    });

    // Python client sends team erg data
    socket.on('team-erg:data', (data) => {
      const { sessionId, teamId, participantId, participantName, metrics, calculatedScore } = data;

      console.log('Server received team erg data:', data);

      // Update team scores
      const session = global.teamErgSessions.get(sessionId);
      if (session && session.teamScores[teamId]) {
        const teamScore = session.teamScores[teamId];
        console.log('Team score for team', teamId, ':', teamScore);
        console.log(
          'Looking for participant:',
          participantId,
          'in participantScores:',
          teamScore.participantScores,
        );

        const participantIndex = teamScore.participantScores.findIndex(
          (p) => p.participantId === participantId,
        );

        if (participantIndex >= 0) {
          console.log('Found participant at index:', participantIndex);
          // Update current score for display but don't add to team total yet
          teamScore.participantScores[participantIndex].currentScore = calculatedScore;
          teamScore.participantScores[participantIndex].isActive = true;

          // Only update team total if participant has completed their session
          if (teamScore.participantScores[participantIndex].isCompleted) {
            teamScore.participantScores[participantIndex].score = calculatedScore;
            teamScore.totalScore = teamScore.participantScores
              .filter((p) => p.isCompleted)
              .reduce((sum, p) => sum + p.score, 0);
          }
          console.log('Updated participant current score:', calculatedScore);
        } else {
          console.log('Participant not found in participantScores array');
        }
      } else {
        console.log('Session or team score not found for team:', teamId);
      }

      // Broadcast to all viewers of this team session
      const updateData = {
        teamId,
        participantId,
        participantName,
        metrics,
        calculatedScore,
        timestamp: new Date().toISOString(),
      };
      console.log(
        'Broadcasting team-erg:update to room:',
        `team-session:${sessionId}`,
        'Data:',
        updateData,
      );
      io.to(`team-session:${sessionId}`).emit('team-erg:update', updateData);

      // Broadcast team score updates
      if (session) {
        const teamScoreData = Object.values(session.teamScores);
        console.log(
          'Broadcasting team-score:update to room:',
          `team-session:${sessionId}`,
          'Data:',
          teamScoreData,
        );
        io.to(`team-session:${sessionId}`).emit('team-score:update', teamScoreData);
      }

      console.log(
        `Team erg data for session ${sessionId}, team ${teamId}, participant ${participantName}:`,
        calculatedScore,
      );
    });

    // Admin stops team session
    socket.on('team-session:stop', (data) => {
      const { sessionId } = data;
      const session = global.teamErgSessions.get(sessionId);

      if (session && session.pythonSocketId) {
        // Notify Python client to disconnect from ergs
        io.to(session.pythonSocketId).emit('team-session:stop', { sessionId });
      }

      // Notify all viewers
      io.to(`team-session:${sessionId}`).emit('team-session:ended');
      global.teamErgSessions.delete(sessionId);
      console.log('Team session stopped:', sessionId);
    });

    // Competitor joins a team
    socket.on('team-competitor:join', (data) => {
      const { sessionId, teamId, competitor } = data;
      const session = global.teamErgSessions.get(sessionId);

      console.log('Server received team-competitor:join:', data);

      if (session && session.teamScores[teamId]) {
        // Add competitor to team
        const teamScore = session.teamScores[teamId];
        const existingIndex = teamScore.participantScores.findIndex(
          (p) => p.participantId === competitor.id,
        );

        if (existingIndex === -1) {
          teamScore.participantScores.push({
            participantId: competitor.id,
            participantName: competitor.name,
            score: 0,
            isActive: false,
          });
          console.log('Added competitor to team:', competitor.id, 'to team:', teamId);
          console.log('Team participantScores now:', teamScore.participantScores);
        } else {
          console.log('Competitor already exists in team');
        }

        // Update session data
        global.teamErgSessions.set(sessionId, session);

        // Broadcast competitor joined
        io.to(`team-session:${sessionId}`).emit('team-competitor:joined', {
          teamId,
          competitor,
        });

        console.log(`Competitor ${competitor.name} joined team ${teamId} in session ${sessionId}`);
      }
    });

    // Competitor leaves a team
    socket.on('team-competitor:leave', (data) => {
      const { sessionId, teamId, competitorId } = data;
      const session = global.teamErgSessions.get(sessionId);

      if (session && session.teamScores[teamId]) {
        const teamScore = session.teamScores[teamId];
        const participantIndex = teamScore.participantScores.findIndex(
          (p) => p.participantId === competitorId,
        );

        if (participantIndex >= 0) {
          // Mark as inactive but keep score
          teamScore.participantScores[participantIndex].isActive = false;

          // Recalculate total team score
          teamScore.totalScore = teamScore.participantScores.reduce((sum, p) => sum + p.score, 0);
        }

        // Update session data
        global.teamErgSessions.set(sessionId, session);

        // Broadcast competitor left
        io.to(`team-session:${sessionId}`).emit('team-competitor:left', {
          teamId,
          competitorId,
        });

        // Broadcast updated team scores
        io.to(`team-session:${sessionId}`).emit(
          'team-score:update',
          Object.values(session.teamScores),
        );

        console.log(`Competitor ${competitorId} left team ${teamId} in session ${sessionId}`);
      }
    });

    // Admin assigns competitor to erg slot
    socket.on('team-competitor:assign', (data) => {
      const { sessionId, assignment } = data;
      const session = global.teamErgSessions.get(sessionId);

      if (session) {
        const { competitorId, competitorName, teamId, teamName, ergSlotId, eventType } = assignment;

        // Add competitor to team's participant scores if not already present
        if (session.teamScores[teamId]) {
          const teamScore = session.teamScores[teamId];
          const existingIndex = teamScore.participantScores.findIndex(
            (p) => p.participantId === competitorId,
          );

          if (existingIndex === -1) {
            teamScore.participantScores.push({
              participantId: competitorId,
              participantName: competitorName,
              score: 0,
              isActive: false,
            });
          }
        }

        // Store assignment in session
        if (!session.assignments) {
          session.assignments = {};
        }
        session.assignments[ergSlotId] = assignment;

        // Notify Python clients about new assignment
        if (session.pythonSocketId) {
          const pythonSocket = global.pythonClients.get(session.pythonSocketId);
          if (pythonSocket) {
            pythonSocket.emit('team-competitor:assign', { assignment });
          }
        }

        // Broadcast to all viewers
        io.to(`team-session:${sessionId}`).emit('team-competitor:assigned', {
          ergSlotId,
          assignment,
        });

        console.log(
          `Competitor ${competitorName} assigned to erg slot ${ergSlotId} for team ${teamName}`,
        );
      }
    });

    // Admin completes competitor session
    socket.on('team-competitor:complete', (data) => {
      const { sessionId, ergSlotId, competitorId, teamId, finalScore } = data;
      const session = global.teamErgSessions.get(sessionId);

      console.log('Server received team-competitor:complete:', data);

      if (session && session.assignments && session.assignments[ergSlotId]) {
        const assignment = session.assignments[ergSlotId];
        const competitorFinalScore = finalScore || assignment.finalScore || 0;

        console.log(
          `Processing completion for competitor ${competitorId} with final score ${competitorFinalScore}`,
        );

        // Update team score with final score (only when competitor completes)
        if (session.teamScores[teamId]) {
          const teamScore = session.teamScores[teamId];
          const participantIndex = teamScore.participantScores.findIndex(
            (p) => p.participantId === competitorId,
          );

          if (participantIndex >= 0) {
            // Set final score and mark as completed
            teamScore.participantScores[participantIndex].score = competitorFinalScore;
            teamScore.participantScores[participantIndex].isActive = false;
            teamScore.participantScores[participantIndex].isCompleted = true;

            // Recalculate total team score (only includes completed scores)
            const oldTotalScore = teamScore.totalScore;
            teamScore.totalScore = teamScore.participantScores
              .filter((p) => p.isCompleted)
              .reduce((sum, p) => sum + p.score, 0);

            console.log(
              `Team ${teamId} score updated: ${oldTotalScore} -> ${teamScore.totalScore}`,
            );
          }
        }

        // Notify Python clients about completion
        if (session.pythonSocketId) {
          const pythonSocket = global.pythonClients.get(session.pythonSocketId);
          if (pythonSocket) {
            pythonSocket.emit('team-competitor:complete', {
              ergSlotId,
              competitorId,
              teamId,
              finalScore: competitorFinalScore,
            });
          }
        }

        // Broadcast completion to all viewers
        io.to(`team-session:${sessionId}`).emit('team-competitor:completed', {
          ergSlotId,
          competitorId,
          teamId,
          finalScore: competitorFinalScore,
        });

        // Broadcast updated team scores
        const teamScoreData = Object.values(session.teamScores);
        console.log('Broadcasting updated team scores:', teamScoreData);
        io.to(`team-session:${sessionId}`).emit('team-score:update', teamScoreData);

        // Remove assignment
        delete session.assignments[ergSlotId];

        console.log(
          `Competitor ${competitorId} session completed on erg slot ${ergSlotId} with final score ${competitorFinalScore}`,
        );
      } else {
        console.log('Session or assignment not found for completion:', {
          sessionId,
          ergSlotId,
          competitorId,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      // Clean up Python client
      if (global.pythonClients.has(socket.id)) {
        global.pythonClients.delete(socket.id);
        console.log('Python client removed:', socket.id);
      }

      // Clean up sessions where this was the Python client
      for (const [sessionId, session] of global.ergSessions.entries()) {
        if (session.pythonSocketId === socket.id) {
          io.to(`session:${sessionId}`).emit('session:python-disconnected');
          session.pythonSocketId = null;
        }
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running`);
    });
});
