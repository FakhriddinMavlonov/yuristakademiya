const axios = require('axios');
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { notify } = require('../../config/socket');

const DAILY_API = 'https://api.daily.co/v1';
const DAILY_API_KEY = process.env.DAILY_API_KEY;

const createDailyRoom = async (meetingId, roomName) => {
  try {
    const response = await axios.post(`${DAILY_API}/rooms`, {
      name: roomName,
      properties: {
        enable_knocking: false,
        enable_chat: true,
        enable_screenshare: true,
        enable_prejoin_ui: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    return response.data;
  } catch (error) {
    console.error('Daily.co room creation error:', error.response?.data || error.message);
    throw new AppError('Failed to create meeting room', 500);
  }
};

const generateDailyToken = async (roomName, userId, userName, isOwner = false) => {
  try {
    const exp = Math.round(Date.now() / 1000) + 86400;
    const response = await axios.post(`${DAILY_API}/meeting-tokens`, {
      properties: {
        room_name: roomName,
        user_id: userId.toString(),
        user_name: userName,
        is_owner: isOwner,
        exp,
        enable_prejoin_ui: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    return response.data.token;
  } catch (error) {
    console.error('Daily.co token creation error:', error.response?.data || error.message);
    throw new AppError('Failed to create meeting token', 500);
  }
};

const list = async (userId, role) => {
  if (role === 'teacher') {
    const { rows } = await query(`
      SELECT m.*, c.title AS course_title,
        COUNT(DISTINCT mp.user_id)::int AS participant_count
      FROM meetings m
      LEFT JOIN courses c ON c.id = m.course_id
      LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
      WHERE m.teacher_id = $1
      GROUP BY m.id, c.title ORDER BY m.scheduled_at DESC
    `, [userId]);
    return rows;
  }
  const { rows } = await query(`
    SELECT m.*, c.title AS course_title, u.first_name||' '||u.last_name AS teacher_name
    FROM meetings m
    JOIN courses c ON c.id = m.course_id
    JOIN users u ON u.id = m.teacher_id
    WHERE m.status IN ('scheduled','live')
      AND (m.audience_type='all' OR EXISTS(
        SELECT 1 FROM meeting_participants WHERE meeting_id=m.id AND user_id=$1
      ))
      AND EXISTS (SELECT 1 FROM enrollments WHERE user_id=$1 AND course_id=m.course_id)
    ORDER BY m.scheduled_at ASC
  `, [userId]);
  return rows;
};

const create = async (teacherId, data) => {
  const roomName = `meeting-${Date.now()}`;
  const dailyRoom = await createDailyRoom(data.courseId, roomName);

  const { rows: [meeting] } = await query(`
    INSERT INTO meetings (course_id, teacher_id, title, description, scheduled_at, duration_minutes, audience_type, daily_room_name, daily_room_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [data.courseId, teacherId, data.title, data.description, data.scheduledAt, data.durationMinutes || 60, data.audienceType || 'all', roomName, dailyRoom.url]);

  if (data.audienceType === 'selected' && data.participantIds?.length) {
    for (const uid of data.participantIds) {
      await query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meeting.id, uid]);
    }
  } else if (data.audienceType === 'all') {
    const { rows: enrolled } = await query('SELECT user_id FROM enrollments WHERE course_id=$1', [data.courseId]);
    for (const e of enrolled) {
      await query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meeting.id, e.user_id]);
      notify(e.user_id, 'meeting:scheduled', { meeting });
    }
  }

  return meeting;
};

const updateStatus = async (meetingId, teacherId, status) => {
  const { rows } = await query(`
    UPDATE meetings SET status=$1 WHERE id=$2 AND teacher_id=$3 RETURNING *
  `, [status, meetingId, teacherId]);
  if (!rows[0]) throw new AppError('Meeting not found', 404);

  if (status === 'live') {
    const { rows: participants } = await query('SELECT user_id FROM meeting_participants WHERE meeting_id=$1', [meetingId]);
    for (const p of participants) {
      notify(p.user_id, 'meeting:started', { meetingId });
    }
  }
  return rows[0];
};

const getStudentProfiles = async (meetingId, teacherId) => {
  const { rows: [m] } = await query('SELECT * FROM meetings WHERE id=$1 AND teacher_id=$2', [meetingId, teacherId]);
  if (!m) throw new AppError('Forbidden', 403);

  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name,
      COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed) ::int AS completed_lessons,
      COUNT(DISTINCT l.id)::int AS total_lessons,
      ROUND(AVG(ta.score_pct) FILTER (WHERE ta.submitted_at IS NOT NULL), 1) AS avg_score
    FROM meeting_participants mp
    JOIN users u ON u.id = mp.user_id
    LEFT JOIN lessons l ON l.course_id = $2
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = u.id
    LEFT JOIN tests t ON t.lesson_id = l.id
    LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.user_id = u.id
    WHERE mp.meeting_id = $1
    GROUP BY u.id
    ORDER BY avg_score DESC NULLS LAST
  `, [meetingId, m.course_id]);
  return rows;
};

const getJoinUrl = async (meetingId, userId, isOwner = false) => {
  const { rows: [meeting] } = await query(`
    SELECT m.* FROM meetings m
    WHERE m.id = $1 AND (
      m.teacher_id = $2 OR m.audience_type = 'all' OR EXISTS(
        SELECT 1 FROM meeting_participants WHERE meeting_id = m.id AND user_id = $2
      )
    )
  `, [meetingId, userId]);
  if (!meeting) throw new AppError('Meeting not found or unauthorized', 404);

  let roomName = meeting.daily_room_name;
  let roomUrl = meeting.daily_room_url;

  if (!roomUrl || !roomName) {
    roomName = `meeting-${meetingId}-${Date.now()}`;
    const dailyRoom = await createDailyRoom(meetingId, roomName);
    roomUrl = dailyRoom.url;
    await query('UPDATE meetings SET daily_room_name=$1, daily_room_url=$2 WHERE id=$3', [roomName, roomUrl, meetingId]);
  }

  const { rows: [user] } = await query('SELECT id, first_name, last_name FROM users WHERE id=$1', [userId]);
  const isTeacher = meeting.teacher_id === userId;
  const token = await generateDailyToken(roomName, userId, `${user.first_name} ${user.last_name}`, isTeacher);

  return {
    meetingId,
    roomName,
    roomUrl,
    token,
    joinUrl: `${roomUrl}?t=${token}`,
    isTeacher,
  };
};

const addParticipant = async (meetingId, teacherId, participantId) => {
  const { rows: [meeting] } = await query('SELECT * FROM meetings WHERE id=$1 AND teacher_id=$2', [meetingId, teacherId]);
  if (!meeting) throw new AppError('Forbidden', 403);

  await query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meetingId, participantId]);
  return { added: true };
};

const removeParticipant = async (meetingId, teacherId, participantId) => {
  const { rows: [meeting] } = await query('SELECT * FROM meetings WHERE id=$1 AND teacher_id=$2', [meetingId, teacherId]);
  if (!meeting) throw new AppError('Forbidden', 403);

  await query('DELETE FROM meeting_participants WHERE meeting_id=$1 AND user_id=$2', [meetingId, participantId]);
  return { removed: true };
};

module.exports = { list, create, updateStatus, getStudentProfiles, getJoinUrl, addParticipant, removeParticipant };
