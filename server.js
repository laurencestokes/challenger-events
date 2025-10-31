const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Handle static assets explicitly for production
      if (
        !dev &&
        (parsedUrl.pathname.startsWith('/_next/static/') ||
          parsedUrl.pathname.startsWith('/_next/chunks/'))
      ) {
        const staticPath = parsedUrl.pathname.replace(/^\/_next\/(static|chunks)\//, '');

        // Try different possible locations for static assets
        const possiblePaths = [
          path.join(process.cwd(), '.next', 'static', staticPath),
          path.join(process.cwd(), '.next', 'chunks', staticPath),
          path.join(process.cwd(), '.next', 'standalone', '.next', 'static', staticPath),
          path.join(process.cwd(), '.next', 'standalone', '.next', 'chunks', staticPath),
          path.join(process.cwd(), 'static', staticPath),
          path.join(process.cwd(), 'chunks', staticPath),
        ];

        console.log('Attempting to serve static asset:', parsedUrl.pathname);

        for (const filePath of possiblePaths) {
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const contentType =
              {
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.map': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.eot': 'application/vnd.ms-fontobject',
              }[ext] || 'application/octet-stream';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            console.log(
              'Serving static asset:',
              parsedUrl.pathname,
              'from:',
              filePath,
              'with content-type:',
              contentType,
            );
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }

        console.log('Static asset not found in any location:', parsedUrl.pathname);
        console.log('Tried paths:', possiblePaths);
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO with extended timeouts for erg client stability
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? '*' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
    },
    // Extended timeouts to prevent disconnects during inactivity
    // pingInterval: how often server sends ping (default 25s)
    pingInterval: 30000, // 30 seconds
    // pingTimeout: time to wait for pong response before considering client dead (default 5s)
    pingTimeout: 20000, // 20 seconds - longer timeout for erg client to respond
    // upgradeTimeout: time to wait for upgrade from HTTP to WebSocket
    upgradeTimeout: 30000, // 30 seconds
    // allowEIO3: allow Engine.IO v3 clients (for compatibility)
    allowEIO3: true,
    // transports: allow both websocket and polling
    transports: ['websocket', 'polling'],
  });

  // Store active sessions and Python client connections
  global.io = io;
  // Use the same storage as the API
  if (!globalThis.ergSessions) {
    globalThis.ergSessions = new Map();
  }
  global.ergSessions = globalThis.ergSessions; // Reference the same Map
  global.pythonClients = new Map(); // socketId -> socket
  global.teamErgSessions = new Map(); // sessionId -> session data

  // Configure HTTP server keep-alive to prevent connection timeouts
  httpServer.keepAliveTimeout = 65000; // 65 seconds (slightly longer than Socket.IO pingInterval)
  httpServer.headersTimeout = 66000; // 66 seconds (must be > keepAliveTimeout)

  io.on('connection', (socket) => {
    const transport = socket.conn.transport.name; // 'polling' or 'websocket'
    console.log(`[CONNECT] Client connected: ${socket.id}, transport: ${transport}`);
    console.log(`[CONNECT] Timestamp: ${new Date().toISOString()}`);

    // Log connection details for debugging
    socket.on('error', (error) => {
      console.error(`[ERROR] Socket ${socket.id} error:`, error);
    });

    // Python client authentication
    socket.on('python:authenticate', (data) => {
      const { apiSecret, sessionId } = data;

      console.log(`[AUTH] Python client attempting authentication: ${socket.id}`);
      console.log(`[AUTH] Has sessionId: ${!!sessionId}, sessionId: ${sessionId || 'none'}`);

      if (apiSecret === process.env.ERG_API_SECRET) {
        global.pythonClients.set(socket.id, socket);
        socket.join(`python-client`);

        // Check if this is a reconnection scenario
        let reconnectedSession = null;
        if (sessionId) {
          const session = global.ergSessions.get(sessionId);
          if (session) {
            // Check if session lost its Python client (reconnection scenario)
            // This happens when:
            // 1. Session has competitors (was active)
            // 2. pythonSocketId is null or points to a disconnected client
            const hasCompetitors = session.competitors && session.competitors.length > 0;
            const oldSocketId = session.pythonSocketId;
            const oldSocketStillConnected = oldSocketId && global.pythonClients.has(oldSocketId);

            // Reconnection if: has competitors AND (no pythonSocketId OR old socket is disconnected)
            if (hasCompetitors && (!oldSocketId || !oldSocketStillConnected)) {
              console.log(
                `[RECONNECT] Session ${sessionId} lost Python client (had ${session.competitors.length} competitors), reconnecting`,
              );
              reconnectedSession = session;
            }

            session.pythonSocketId = socket.id;
            global.ergSessions.set(sessionId, session);
            console.log(`[AUTH] Python client ${socket.id} linked to session ${sessionId}`);

            // If reconnecting, restore session data
            if (reconnectedSession) {
              console.log(
                `[RECONNECT] ✅ Restoring session ${sessionId} for Python client ${socket.id}`,
              );
              console.log(`[RECONNECT] Competitors: ${JSON.stringify(session.competitors || [])}`);

              socket.emit('python:authenticated', {
                success: true,
                reconnected: true,
                sessionId,
                session: {
                  sessionId,
                  competitors: session.competitors || [],
                  eventId: session.eventId,
                  eventType: session.eventType,
                },
              });

              // Automatically restore the session by sending session:new event
              // This tells the Python client to resume streaming for this session
              setTimeout(() => {
                console.log(
                  `[RECONNECT] Sending session:new event to restore streaming for session ${sessionId}`,
                );
                socket.emit('session:new', {
                  sessionId,
                  competitors: session.competitors || [],
                });
              }, 500); // Small delay to ensure authentication response is sent first

              // Notify session viewers that Python client reconnected
              io.to(`session:${sessionId}`).emit('session:python-reconnected', { sessionId });
            } else {
              socket.emit('python:authenticated', { success: true });
            }
          } else {
            console.warn(`[AUTH] Session ${sessionId} not found for Python client ${socket.id}`);
            socket.emit('python:authenticated', { success: true });
          }
        } else {
          // No sessionId provided - check if there's an orphaned session looking for a Python client
          for (const [sId, s] of global.ergSessions.entries()) {
            if (
              s.competitors &&
              s.competitors.length > 0 &&
              (!s.pythonSocketId || !global.pythonClients.has(s.pythonSocketId))
            ) {
              console.log(
                `[RECONNECT] Found orphaned session ${sId}, linking to Python client ${socket.id}`,
              );
              s.pythonSocketId = socket.id;
              global.ergSessions.set(sId, s);
              reconnectedSession = s;
              socket.emit('python:authenticated', {
                success: true,
                reconnected: true,
                sessionId: sId,
                session: {
                  sessionId: sId,
                  competitors: s.competitors || [],
                  eventId: s.eventId,
                  eventType: s.eventType,
                },
              });

              // Automatically restore the session by sending session:new event
              setTimeout(() => {
                console.log(
                  `[RECONNECT] Sending session:new event to restore streaming for orphaned session ${sId}`,
                );
                socket.emit('session:new', {
                  sessionId: sId,
                  competitors: s.competitors || [],
                });
              }, 500); // Small delay to ensure authentication response is sent first

              io.to(`session:${sId}`).emit('session:python-reconnected', { sessionId: sId });
              break;
            }
          }

          if (!reconnectedSession) {
            socket.emit('python:authenticated', { success: true });
          }
        }

        console.log(`[AUTH] ✅ Python client authenticated successfully: ${socket.id}`);
        console.log(`[AUTH] Total Python clients connected: ${global.pythonClients.size}`);
      } else {
        console.error(`[AUTH] ❌ Authentication failed for ${socket.id}: Invalid API secret`);
        socket.emit('python:authenticated', { success: false, error: 'Invalid API secret' });
        socket.disconnect();
      }
    });

    // Admin starts a head-to-head session
    socket.on('session:start', (data) => {
      const { sessionId, competitors, eventId, eventType } = data;

      console.log('Session start received:', { sessionId, competitors, eventId, eventType });
      console.log('Available sessions in storage:', Array.from(global.ergSessions.keys()));
      console.log('Competitors type:', typeof competitors, 'Length:', competitors?.length);
      console.log('Competitors content:', JSON.stringify(competitors, null, 2));

      // Get existing session data if it exists, otherwise create new
      const existingSession = global.ergSessions.get(sessionId) || {};
      console.log('Existing session data:', existingSession);
      console.log('Existing competitors:', existingSession.competitors);

      global.ergSessions.set(sessionId, {
        ...existingSession, // Preserve existing data like eventId, eventType, etc.
        competitors: competitors.length > 0 ? competitors : existingSession.competitors,
        eventId: eventId || existingSession.eventId,
        eventType: eventType || existingSession.eventType,
        pythonSocketId: null,
        startedAt: new Date().toISOString(),
      });

      console.log('Session stored in global.ergSessions:', global.ergSessions.get(sessionId));
      console.log('Final competitors after update:', global.ergSessions.get(sessionId).competitors);

      socket.join(`session:${sessionId}`);

      // Notify Python client about new session
      io.to('python-client').emit('session:new', {
        sessionId,
        competitors,
      });

      console.log(
        'Session started:',
        sessionId,
        'with eventId:',
        eventId || existingSession.eventId,
      );
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
      console.log('Server received erg:data:', data);
      console.log('Broadcasting to session:', `session:${sessionId}`);

      // Broadcast to all viewers of this session
      io.to(`session:${sessionId}`).emit('erg:update', {
        competitorIndex,
        metrics,
        calculatedScore,
        timestamp: new Date().toISOString(),
      });
      console.log('Server broadcasted erg:update for competitor', competitorIndex);

      console.log(
        `Erg data for session ${sessionId}, competitor ${competitorIndex}:`,
        calculatedScore,
      );
    });

    // Admin stops session
    socket.on('session:stop', (data) => {
      // Handle both object and string formats
      const sessionId = typeof data === 'string' ? data : data.sessionId;

      const session = global.ergSessions.get(sessionId);

      if (session && session.pythonSocketId) {
        // Notify Python client to disconnect from ergs
        io.to(session.pythonSocketId).emit('session:stop', { sessionId });
      }

      // Notify all viewers that the session has ended
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit('session:ended', { sessionId });

      // Notify Python clients
      io.to(`python-client`).emit('session:stop', { sessionId });

      global.ergSessions.delete(sessionId);
      console.log('Session stopped:', sessionId);
    });

    // Admin updates competitors in an existing session
    socket.on('session:update-competitors', (data) => {
      const { sessionId, competitors } = data;
      const session = global.ergSessions.get(sessionId);

      if (!session) {
        console.error('Session not found for competitor update:', sessionId);
        return;
      }

      // Update session data
      session.competitors = competitors;
      session.updatedAt = new Date().toISOString();
      global.ergSessions.set(sessionId, session);

      // Notify Python client to update competitors and restart streaming
      if (session.pythonSocketId) {
        io.to(session.pythonSocketId).emit('session:competitors-updated', {
          sessionId,
          competitors,
        });
      } else {
        // Broadcast to all Python clients if no specific socket ID
        io.to('python-client').emit('session:competitors-updated', {
          sessionId,
          competitors,
        });
      }

      // Broadcast to all viewers
      io.to(`session:${sessionId}`).emit('session:competitors-updated', {
        sessionId,
        competitors,
      });

      console.log('Session competitors updated:', sessionId);
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
        const { competitorId, competitorName, teamId, teamName, ergSlotId } = assignment;

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

    socket.on('disconnect', (reason) => {
      const isPythonClient = global.pythonClients.has(socket.id);
      const clientType = isPythonClient ? 'Python Erg Client' : 'Web Client';

      console.log(`[DISCONNECT] ${clientType} disconnected:`, socket.id);
      console.log(`[DISCONNECT] Reason:`, reason);
      console.log(`[DISCONNECT] Timestamp:`, new Date().toISOString());

      // Common disconnect reasons:
      // - 'transport close': Network error or client closed connection
      // - 'ping timeout': Client didn't respond to ping (server-side timeout)
      // - 'transport error': WebSocket transport error
      // - 'server namespace disconnect': Server forcefully disconnected
      // - 'client namespace disconnect': Client manually disconnected

      if (reason === 'ping timeout') {
        console.warn(`[DISCONNECT] ${clientType} timed out - client not responding to pings`);
        console.warn(`[DISCONNECT] This may indicate network issues or client busy`);
      }

      // Clean up Python client
      if (isPythonClient) {
        global.pythonClients.delete(socket.id);
        console.log('[DISCONNECT] Python client removed from tracking:', socket.id);

        // Mark sessions as disconnected but keep session data for reconnection
        for (const [sessionId, session] of global.ergSessions.entries()) {
          if (session.pythonSocketId === socket.id) {
            console.log(
              `[DISCONNECT] Session ${sessionId} lost Python client - keeping session data for reconnection`,
            );
            console.log(
              `[DISCONNECT] Session has ${session.competitors?.length || 0} competitors - will attempt auto-reconnect`,
            );

            // Notify viewers of disconnect but keep session alive
            io.to(`session:${sessionId}`).emit('session:python-disconnected');

            // Clear Python socket ID to allow reconnection, but keep session data
            session.pythonSocketId = null;
            session.disconnectedAt = new Date().toISOString();
            global.ergSessions.set(sessionId, session);

            // Note: Session data is preserved - when Python client reconnects,
            // it will automatically be linked back via the authentication handler
          }
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
