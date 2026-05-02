const { query, transaction } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { notify } = require('../../config/socket');

const list = async (userId, role) => {
  if (role === 'teacher') {
    const { rows } = await query(`
      SELECT e.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name))
          FILTER (WHERE g.id IS NOT NULL), '[]') AS groups,
        COUNT(DISTINCT mer.user_id)::int AS results_posted
      FROM mock_exams e
      LEFT JOIN mock_exam_groups eg ON eg.exam_id = e.id
      LEFT JOIN groups g ON g.id = eg.group_id
      LEFT JOIN mock_exam_results mer ON mer.exam_id = e.id
      WHERE e.teacher_id = $1
      GROUP BY e.id
      ORDER BY e.scheduled_at DESC
    `, [userId]);
    return rows;
  }
  if (role === 'admin') {
    const { rows } = await query(`
      SELECT e.*,
        u.first_name || ' ' || u.last_name AS teacher_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name))
          FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
      FROM mock_exams e
      LEFT JOIN users u ON u.id = e.teacher_id
      LEFT JOIN mock_exam_groups eg ON eg.exam_id = e.id
      LEFT JOIN groups g ON g.id = eg.group_id
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY e.scheduled_at DESC
    `);
    return rows;
  }
  // student — only exams for their groups, with their result if any
  const { rows } = await query(`
    SELECT e.*,
      u.first_name || ' ' || u.last_name AS teacher_name,
      mer.score AS my_score,
      mer.feedback AS my_feedback,
      mer.posted_at AS my_posted_at,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name))
        FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
    FROM mock_exams e
    JOIN mock_exam_groups eg ON eg.exam_id = e.id
    JOIN group_students gs ON gs.group_id = eg.group_id
    LEFT JOIN groups g ON g.id = eg.group_id
    LEFT JOIN users u ON u.id = e.teacher_id
    LEFT JOIN mock_exam_results mer ON mer.exam_id = e.id AND mer.user_id = $1
    WHERE gs.user_id = $1
    GROUP BY e.id, u.first_name, u.last_name, mer.score, mer.feedback, mer.posted_at
    ORDER BY e.scheduled_at DESC
  `, [userId]);
  return rows;
};

const create = async (teacherId, data) => {
  if (!data.title || !data.scheduledAt || !Array.isArray(data.groupIds) || !data.groupIds.length) {
    throw new AppError('title, scheduledAt va kamida bitta groupId kerak', 400);
  }
  return transaction(async (client) => {
    const { rows: [exam] } = await client.query(`
      INSERT INTO mock_exams (teacher_id, title, topic, scheduled_at, location, duration_minutes, max_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [
      teacherId, data.title, data.topic || null, data.scheduledAt,
      data.location || 'O\'quv markaz', data.durationMinutes || 90, data.maxScore || 100,
    ]);
    for (const gid of data.groupIds) {
      await client.query(
        'INSERT INTO mock_exam_groups (exam_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [exam.id, gid]
      );
    }
    // notify all students in those groups
    const { rows: students } = await client.query(`
      SELECT DISTINCT gs.user_id FROM group_students gs WHERE gs.group_id = ANY($1::int[])
    `, [data.groupIds]);
    for (const s of students) {
      notify(s.user_id, 'exam:scheduled', { examId: exam.id, title: data.title, scheduledAt: data.scheduledAt });
    }
    return exam;
  });
};

const update = async (examId, teacherId, role, data) => {
  const { rows: [own] } = await query('SELECT teacher_id FROM mock_exams WHERE id=$1', [examId]);
  if (!own) throw new AppError('Imtihon topilmadi', 404);
  if (role !== 'admin' && own.teacher_id !== teacherId) throw new AppError('Forbidden', 403);

  return transaction(async (client) => {
    const { rows: [exam] } = await client.query(`
      UPDATE mock_exams SET
        title = COALESCE($1, title),
        topic = COALESCE($2, topic),
        scheduled_at = COALESCE($3, scheduled_at),
        location = COALESCE($4, location),
        duration_minutes = COALESCE($5, duration_minutes),
        max_score = COALESCE($6, max_score),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8 RETURNING *
    `, [
      data.title, data.topic, data.scheduledAt, data.location,
      data.durationMinutes, data.maxScore, data.status, examId,
    ]);
    if (Array.isArray(data.groupIds)) {
      await client.query('DELETE FROM mock_exam_groups WHERE exam_id=$1', [examId]);
      for (const gid of data.groupIds) {
        await client.query(
          'INSERT INTO mock_exam_groups (exam_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [examId, gid]
        );
      }
    }
    return exam;
  });
};

const remove = async (examId, teacherId, role) => {
  const { rows: [own] } = await query('SELECT teacher_id FROM mock_exams WHERE id=$1', [examId]);
  if (!own) throw new AppError('Imtihon topilmadi', 404);
  if (role !== 'admin' && own.teacher_id !== teacherId) throw new AppError('Forbidden', 403);
  await query('DELETE FROM mock_exams WHERE id=$1', [examId]);
  return { deleted: true };
};

const getStudentsForResults = async (examId, teacherId, role) => {
  const { rows: [exam] } = await query('SELECT * FROM mock_exams WHERE id=$1', [examId]);
  if (!exam) throw new AppError('Imtihon topilmadi', 404);
  if (role !== 'admin' && exam.teacher_id !== teacherId) throw new AppError('Forbidden', 403);

  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.phone,
      mer.score, mer.feedback, mer.posted_at,
      g.name AS group_name
    FROM mock_exam_groups eg
    JOIN groups g ON g.id = eg.group_id
    JOIN group_students gs ON gs.group_id = eg.group_id
    JOIN users u ON u.id = gs.user_id
    LEFT JOIN mock_exam_results mer ON mer.exam_id = eg.exam_id AND mer.user_id = u.id
    WHERE eg.exam_id = $1
    GROUP BY u.id, u.first_name, u.last_name, u.phone, mer.score, mer.feedback, mer.posted_at, g.name
    ORDER BY g.name, u.first_name
  `, [examId]);
  return { exam, students: rows };
};

const postResults = async (examId, teacherId, role, results) => {
  const { rows: [exam] } = await query('SELECT * FROM mock_exams WHERE id=$1', [examId]);
  if (!exam) throw new AppError('Imtihon topilmadi', 404);
  if (role !== 'admin' && exam.teacher_id !== teacherId) throw new AppError('Forbidden', 403);

  return transaction(async (client) => {
    for (const r of results) {
      if (r.score === null || r.score === undefined || r.score === '') continue;
      await client.query(`
        INSERT INTO mock_exam_results (exam_id, user_id, score, feedback)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (exam_id, user_id)
        DO UPDATE SET score=EXCLUDED.score, feedback=EXCLUDED.feedback, posted_at=NOW()
      `, [examId, r.userId, r.score, r.feedback || null]);
      notify(r.userId, 'exam:result_posted', { examId, score: r.score, title: exam.title });
    }
    await client.query("UPDATE mock_exams SET status='completed' WHERE id=$1", [examId]);
    return { posted: results.length };
  });
};

module.exports = { list, create, update, remove, getStudentsForResults, postResults };
