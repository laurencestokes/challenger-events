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
