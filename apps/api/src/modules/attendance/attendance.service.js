const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const getForDate = async (groupId, date, userId, role) => {
  const { rows: [group] } = await query('SELECT * FROM groups WHERE id=$1', [groupId]);
  if (!group) throw new AppError('Group not found', 404);
  if (role === 'teacher' && group.teacher_id !== userId) throw new AppError('Forbidden', 403);

  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.phone,
      a.id AS attendance_id, a.status, a.note
    FROM group_students gs
    JOIN users u ON u.id = gs.user_id
    LEFT JOIN attendance a ON a.user_id = u.id AND a.group_id = $1 AND a.date = $2
    WHERE gs.group_id = $1
    ORDER BY u.first_name
  `, [groupId, date]);

  return { date, groupId, students: rows };
};

const markBulk = async (groupId, date, records, userId, role) => {
  const { rows: [group] } = await query('SELECT * FROM groups WHERE id=$1', [groupId]);
  if (!group) throw new AppError('Group not found', 404);
  if (role === 'teacher' && group.teacher_id !== userId) throw new AppError('Forbidden', 403);

  for (const r of records) {
    await query(`
      INSERT INTO attendance (group_id, user_id, date, status, note, marked_by)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (group_id, user_id, date) DO UPDATE SET
        status = $4, note = $5, marked_by = $6
    `, [groupId, r.userId, date, r.status, r.note || null, userId]);
  }
  return { marked: records.length };
};

const getStudentHistory = async (groupId, studentId) => {
  const { rows } = await query(`
    SELECT a.date, a.status, a.note,
      u.first_name || ' ' || u.last_name AS marked_by_name
    FROM attendance a
    LEFT JOIN users u ON u.id = a.marked_by
    WHERE a.group_id = $1 AND a.user_id = $2
    ORDER BY a.date DESC
  `, [groupId, studentId]);

  const total = rows.length;
  const present = rows.filter(r => r.status === 'present').length;
  const late = rows.filter(r => r.status === 'late').length;
  const absent = rows.filter(r => r.status === 'absent').length;
  const excused = rows.filter(r => r.status === 'excused').length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return { records: rows, stats: { total, present, late, absent, excused, rate } };
};

const getGroupStats = async (groupId, userId, role) => {
  const { rows: [group] } = await query('SELECT * FROM groups WHERE id=$1', [groupId]);
  if (!group) throw new AppError('Group not found', 404);
  if (role === 'teacher' && group.teacher_id !== userId) throw new AppError('Forbidden', 403);

  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name,
      COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present,
      COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late,
      COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
      COUNT(a.id) FILTER (WHERE a.status = 'excused')::int AS excused,
      COUNT(a.id)::int AS total,
      CASE WHEN COUNT(a.id) > 0
        THEN ROUND((COUNT(a.id) FILTER (WHERE a.status IN ('present','late'))::numeric / COUNT(a.id)) * 100)
        ELSE 0
      END AS attendance_rate
    FROM group_students gs
    JOIN users u ON u.id = gs.user_id
    LEFT JOIN attendance a ON a.user_id = u.id AND a.group_id = $1
    WHERE gs.group_id = $1
    GROUP BY u.id, u.first_name, u.last_name
    ORDER BY attendance_rate DESC NULLS LAST
  `, [groupId]);
  return rows;
};

const getMyHistory = async (userId) => {
  const { rows } = await query(`
    SELECT a.date, a.status, a.note, a.group_id,
      g.name AS group_name,
      u.first_name || ' ' || u.last_name AS marked_by_name
    FROM attendance a
    JOIN groups g ON g.id = a.group_id
    LEFT JOIN users u ON u.id = a.marked_by
    WHERE a.user_id = $1
    ORDER BY a.date DESC
    LIMIT 90
  `, [userId]);

  const total = rows.length;
  const present = rows.filter(r => r.status === 'present').length;
  const late = rows.filter(r => r.status === 'late').length;
  const absent = rows.filter(r => r.status === 'absent').length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return { records: rows, stats: { total, present, late, absent, rate } };
};

module.exports = { getForDate, markBulk, getStudentHistory, getGroupStats, getMyHistory };
