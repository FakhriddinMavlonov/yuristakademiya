const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    socket.on('chat:join', (roomId) => socket.join(`chat:${roomId}`));

    socket.on('chat:message', ({ to, content }) => {
      io.to(`user:${to}`).emit('chat:message', {
        from: userId,
        content,
        createdAt: new Date(),
      });
    });

    socket.on('meeting:join', (meetingId) => {
      socket.join(`meeting:${meetingId}`);
      socket.to(`meeting:${meetingId}`).emit('meeting:participant_joined', { userId });
    });

    socket.on('disconnect', () => {
      io.emit('user:offline', { userId });
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const notify = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

module.exports = { initSocket, getIo, notify };
