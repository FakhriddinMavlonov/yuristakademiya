const axios = require('axios');
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { notify } = require('../../config/socket');
const pushSvc = require('../push/push.service');

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
    LEFT JOIN courses c ON c.id = m.course_id
    JOIN users u ON u.id = m.teacher_id
    WHERE m.status IN ('scheduled','live')
      AND (
        EXISTS(SELECT 1 FROM meeting_participants WHERE meeting_id=m.id AND user_id=$1)
        OR (m.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM group_students WHERE group_id=m.group_id AND user_id=$1))
        OR (m.audience_type='all' AND m.course_id IS NOT NULL AND EXISTS(SELECT 1 FROM enrollments WHERE user_id=$1 AND course_id=m.course_id))
      )
    ORDER BY m.scheduled_at ASC
  `, [userId]);
  return rows;
};

const create = async (teacherId, data) => {
  const roomName = `meeting-${Date.now()}`;
  const dailyRoom = await createDailyRoom(data.courseId || data.groupId, roomName);

  const { rows: [meeting] } = await query(`
    INSERT INTO meetings (course_id, group_id, teacher_id, title, description, scheduled_at, duration_minutes, audience_type, daily_room_name, daily_room_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [
    data.courseId || null, data.groupId || null, teacherId,
    data.title, data.description, data.scheduledAt,
    data.durationMinutes || 60, data.audienceType || 'all', roomName, dailyRoom.url,
  ]);

  let recipientIds = [];
  if (data.audienceType === 'selected' && data.participantIds?.length) {
    for (const uid of data.participantIds) {
      await query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meeting.id, uid]);
    }
    recipientIds = data.participantIds;
  } else if (data.groupId) {
    const { rows } = await query('SELECT user_id FROM group_students WHERE group_id=$1', [data.groupId]);
    for (const e of rows) {
      await query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meeting.id, e.user_id]);
    }
    recipientIds = rows.map((r) => r.user_id);
  } else if (data.audienceType === 'all' && data.courseId) {
    const { rows: enrolled } = await query('SELECT user_id FROM enrollments WHERE course_id=$1', [data.courseId]);
    for (const e of enrolled) {
      await query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meeting.id, e.user_id]);
    }
    recipientIds = enrolled.map((r) => r.user_id);
  }

  for (const uid of recipientIds) notify(uid, 'meeting:scheduled', { meeting });
  return meeting;
};

const ringStudents = async (meeting, teacherId) => {
  // Collect recipients from all applicable sources so late-enrolled students are covered too
  let userIdSet = new Set();

  // Always include explicit participants
  const { rows: explicit } = await query(
    'SELECT user_id FROM meeting_participants WHERE meeting_id=$1',
    [meeting.id]
  );
  explicit.forEach((r) => userIdSet.add(r.user_id));

  // For audience=all or group-based meetings, also pull from enrollments/group_students
  if (meeting.audience_type === 'all' && meeting.course_id) {
    const { rows: enrolled } = await query(
      'SELECT user_id FROM enrollments WHERE course_id=$1',
      [meeting.course_id]
    );
    enrolled.forEach((r) => userIdSet.add(r.user_id));
  }
  if (meeting.group_id) {
    const { rows: groupStudents } = await query(
      'SELECT user_id FROM group_students WHERE group_id=$1',
      [meeting.group_id]
    );
    groupStudents.forEach((r) => userIdSet.add(r.user_id));
  }

  const userIds = [...userIdSet];
  if (!userIds.length) {
    console.warn(`[meetings] meeting ${meeting.id} has no participants — nobody to ring`);
    return;
  }
  const { rows: [teacher] } = await query('SELECT first_name, last_name FROM users WHERE id=$1', [teacherId]);
  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Ustoz';

  console.log(`[meetings] ringing ${userIds.length} students for meeting ${meeting.id}: [${userIds.join(',')}]`);

  // Socket (real-time) — for users with the site open
  for (const uid of userIds) {
    notify(uid, 'meeting:started', {
      meetingId: meeting.id,
      title: meeting.title,
      teacherName,
      roomUrl: meeting.daily_room_url,
    });
  }
  // Web push — for users with the site closed (PWA)
  pushSvc.sendToUsers(userIds, {
    type: 'meeting:started',
    title: `📞 ${teacherName} qo'ng'iroq qilmoqda`,
    body: meeting.title,
    tag: `meeting-${meeting.id}`,
    meetingId: meeting.id,
    url: `/student/meetings/${meeting.id}`,
  }).then((r) => console.log(`[push] meeting ring → sent=${r.sent}, failed=${r.failed}, skipped=${r.skipped || false}`))
    .catch((e) => console.error('[push] meeting ring failed:', e.message));
};

const updateStatus = async (meetingId, teacherId, status) => {
  const { rows } = await query(`
    UPDATE meetings SET status=$1 WHERE id=$2 AND teacher_id=$3 RETURNING *
  `, [status, meetingId, teacherId]);
  if (!rows[0]) throw new AppError('Meeting not found', 404);

  if (status === 'live') {
    await ringStudents(rows[0], teacherId);
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
    meeting.daily_room_name = roomName;
    meeting.daily_room_url = roomUrl;
  }

  const isTeacher = meeting.teacher_id === userId;

  // When the teacher joins, auto-transition to 'live' and ring all students.
  // This ensures students always get a call even if the teacher skips the
  // explicit "Start" button and clicks "Join" directly.
  if (isTeacher && meeting.status !== 'live' && meeting.status !== 'ended') {
    await query("UPDATE meetings SET status='live' WHERE id=$1", [meetingId]);
    meeting.status = 'live';
    await ringStudents(meeting, userId);
  }

  const { rows: [user] } = await query('SELECT id, first_name, last_name FROM users WHERE id=$1', [userId]);
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
