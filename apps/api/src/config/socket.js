const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('./db');

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

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;
    socket.join(`user:${userId}`);

    // On connect, push any live meeting so students who reconnect don't miss the ring
    if (role === 'student') {
      try {
        const { rows } = await query(`
          SELECT m.id, m.title, m.daily_room_url,
            u.first_name||' '||u.last_name AS teacher_name
          FROM meetings m
          JOIN users u ON u.id = m.teacher_id
          WHERE m.status = 'live' AND (
            EXISTS(SELECT 1 FROM meeting_participants WHERE meeting_id=m.id AND user_id=$1)
            OR (m.audience_type='all' AND m.course_id IS NOT NULL AND
                EXISTS(SELECT 1 FROM enrollments WHERE course_id=m.course_id AND user_id=$1))
            OR (m.group_id IS NOT NULL AND
                EXISTS(SELECT 1 FROM group_students WHERE group_id=m.group_id AND user_id=$1))
          )
          ORDER BY m.scheduled_at DESC LIMIT 1
        `, [userId]);
        if (rows[0]) {
          console.log(`[socket] reconnect-ring → user ${userId} meeting ${rows[0].id}`);
          socket.emit('meeting:started', {
            meetingId: rows[0].id,
            title: rows[0].title,
            teacherName: rows[0].teacher_name,
            roomUrl: rows[0].daily_room_url,
          });
        }
      } catch (e) {
        console.warn('[socket] live-meeting check failed:', e.message);
      }
    }

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
