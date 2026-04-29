const { pool } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const assertAccess = (role, allowed) => {
  if (!allowed.includes(role)) throw new AppError('Forbidden', 403);
};

const assertGroupAccess = async (client, groupId, userId, role) => {
  if (role === 'admin') return;
  if (role === 'teacher') {
    const { rows } = await client.query('SELECT id FROM groups WHERE id=$1 AND teacher_id=$2', [groupId, userId]);
    if (!rows.length) throw new AppError('Forbidden', 403);
    return;
  }
  if (role === 'student') {
    const { rows } = await client.query('SELECT id FROM group_students WHERE group_id=$1 AND user_id=$2', [groupId, userId]);
    if (!rows.length) throw new AppError('Forbidden', 403);
  }
};

const getForDate = async (groupId, date, userId, role) => {
  assertAccess(role, ['admin', 'teacher']);
  const client = await pool.connect();
  try {
    await assertGroupAccess(client, groupId, userId, role);
    const { rows } = await client.query(`
      SELECT
        u.id, u.first_name, u.last_name, u.phone,
        g.score, g.comment
      FROM group_students gs
      JOIN users u ON u.id = gs.user_id
      LEFT JOIN daily_grades g ON g.user_id = u.id AND g.group_id = $1 AND g.date = $2
      WHERE gs.group_id = $1
      ORDER BY u.last_name, u.first_name
    `, [groupId, date]);
    return { students: rows };
  } finally { client.release(); }
};

const markBulk = async (groupId, date, records, userId, role) => {
  assertAccess(role, ['admin', 'teacher']);
  const client = await pool.connect();
  try {
    await assertGroupAccess(client, groupId, userId, role);
    await client.query('BEGIN');
    for (const r of records) {
      if (r.score === null || r.score === undefined || r.score === '') continue;
      const score = parseInt(r.score, 10);
      if (isNaN(score) || score < 0 || score > 10) continue;
      await client.query(`
        INSERT INTO daily_grades (group_id, user_id, date, score, comment, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (group_id, user_id, date) DO UPDATE SET
          score = EXCLUDED.score,
          comment = EXCLUDED.comment,
          marked_by = EXCLUDED.marked_by
      `, [groupId, r.userId, date, score, r.comment || null, userId]);
    }
    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const getStudentHistory = async (groupId, studentId, userId, role) => {
  assertAccess(role, ['admin', 'teacher']);
  const client = await pool.connect();
  try {
    await assertGroupAccess(client, groupId, userId, role);
    const { rows } = await client.query(`
      SELECT date, score, comment FROM daily_grades
      WHERE group_id=$1 AND user_id=$2
      ORDER BY date DESC LIMIT 60
    `, [groupId, studentId]);
    const avg = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length * 10) / 10
      : null;
    return { records: rows, stats: { total: rows.length, avg } };
  } finally { client.release(); }
};

const getGroupStats = async (groupId, userId, role) => {
  assertAccess(role, ['admin', 'teacher']);
  const client = await pool.connect();
  try {
    await assertGroupAccess(client, groupId, userId, role);
    const { rows } = await client.query(`
      SELECT
        u.id, u.first_name, u.last_name,
        COUNT(g.id)::int AS grade_count,
        ROUND(AVG(g.score)::numeric, 1) AS avg_score,
        MIN(g.score) AS min_score,
        MAX(g.score) AS max_score
      FROM group_students gs
      JOIN users u ON u.id = gs.user_id
      LEFT JOIN daily_grades g ON g.user_id = u.id AND g.group_id = $1
      WHERE gs.group_id = $1
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY avg_score DESC NULLS LAST
    `, [groupId]);
    return rows;
  } finally { client.release(); }
};

const getMyHistory = async (userId) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        g.date, g.score, g.comment,
        gr.id AS group_id, gr.name AS group_name
      FROM daily_grades g
      JOIN groups gr ON gr.id = g.group_id
      WHERE g.user_id = $1
      ORDER BY g.date DESC LIMIT 90
    `, [userId]);

    const total = rows.length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + r.score, 0) / total * 10) / 10 : null;
    const best = total ? Math.max(...rows.map(r => r.score)) : null;

    return { records: rows, stats: { total, avg, best } };
  } finally { client.release(); }
};

module.exports = { getForDate, markBulk, getStudentHistory, getGroupStats, getMyHistory };
