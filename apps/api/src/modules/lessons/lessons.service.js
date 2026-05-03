const axios = require('axios');
const FormData = require('form-data');
const { query, transaction } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const listByCourse = async (courseId, userId, role) => {
  const { rows: lessons } = await query(`
    SELECT l.*,
      lp.is_completed, lp.watched_seconds,
      t.id AS test_id, t.pass_score_pct, t.title AS test_title, t.time_limit_minutes,
      ta_best.score_pct AS best_score,
      a.id AS assignment_id, a.title AS assignment_title, a.description AS assignment_description,
      subs.id AS submission_id, subs.submitted_at, subs.score AS submission_score, subs.feedback AS submission_feedback
    FROM lessons l
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
    LEFT JOIN tests t ON t.lesson_id = l.id
    LEFT JOIN LATERAL (
      SELECT score_pct FROM test_attempts
      WHERE user_id=$2 AND test_id=t.id AND submitted_at IS NOT NULL
      ORDER BY score_pct DESC LIMIT 1
    ) ta_best ON true
    LEFT JOIN assignments a ON a.lesson_id = l.id
    LEFT JOIN assignment_submissions subs ON subs.assignment_id = a.id AND subs.user_id = $2
    WHERE l.course_id=$1 ${role === 'student' ? 'AND l.is_published=true' : ''}
    ORDER BY l.order_num
  `, [courseId, userId]);

  if (role === 'student') {
    // Unlock logic: previous lesson requires BOTH test passed (≥80%) AND homework submitted
    return lessons.map((l, i) => {
      let locked = false;
      if (i > 0) {
        const prev = lessons[i - 1];
        const testOk = !prev.test_id || (prev.best_score !== null && prev.best_score >= (prev.pass_score_pct || 80));
        const homeworkOk = !prev.assignment_id || !!prev.submitted_at;
        locked = !(testOk && homeworkOk);
      }
      return { ...l, locked };
    });
  }
  return lessons;
};

const get = async (id, userId, role) => {
  const { rows: [lesson] } = await query(`
    SELECT l.*, c.teacher_id
    FROM lessons l JOIN courses c ON c.id = l.course_id
    WHERE l.id=$1
  `, [id]);
  if (!lesson) throw new AppError('Lesson not found', 404);
  if (role === 'teacher' && lesson.teacher_id !== userId) throw new AppError('Forbidden', 403);

  const { rows: materials } = await query('SELECT * FROM materials WHERE lesson_id=$1 ORDER BY created_at', [id]);
  const { rows: [test] } = await query('SELECT * FROM tests WHERE lesson_id=$1', [id]);
  const { rows: [assignment] } = await query('SELECT * FROM assignments WHERE lesson_id=$1', [id]);

  return { ...lesson, materials, test: test || null, assignment: assignment || null };
};

const create = async (courseId, teacherId, data) => {
  const { rows: [course] } = await query('SELECT id FROM courses WHERE id=$1 AND teacher_id=$2', [courseId, teacherId]);
  if (!course) throw new AppError('Course not found', 404);
  const { rows } = await query(`
    INSERT INTO lessons (course_id, order_num, title, description, is_published)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [courseId, data.orderNum, data.title, data.description, data.isPublished || false]);
  return rows[0];
};

const update = async (id, teacherId, data) => {
  const suppLinks = data.supplementaryLinks !== undefined
    ? JSON.stringify(data.supplementaryLinks)
    : undefined;
  const { rows } = await query(`
    UPDATE lessons SET
      title=COALESCE($1,title), description=COALESCE($2,description),
      order_num=COALESCE($3,order_num), is_published=COALESCE($4,is_published),
      supplementary_links=COALESCE($7::jsonb, supplementary_links),
      updated_at=NOW()
    WHERE id=$5 AND course_id IN (SELECT id FROM courses WHERE teacher_id=$6)
    RETURNING *
  `, [data.title, data.description, data.orderNum, data.isPublished, id, teacherId, suppLinks ?? null]);
  if (!rows[0]) throw new AppError('Lesson not found', 404);
  return rows[0];
};

const uploadVideoToBunny = async (lessonId, teacherId, fileBuffer, fileName) => {
  const { rows: [lesson] } = await query(`
    SELECT l.id, c.teacher_id FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=$1
  `, [lessonId]);
  if (!lesson || lesson.teacher_id !== teacherId) throw new AppError('Forbidden', 403);

  const guid = `lesson_${lessonId}_${Date.now()}`;
  const url = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/videos/${guid}.mp4`;

  await axios.put(url, fileBuffer, {
    headers: {
      AccessKey: process.env.BUNNY_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
  });

  const videoUrl = `${process.env.BUNNY_CDN_URL}/videos/${guid}.mp4`;
  await query('UPDATE lessons SET video_guid=$1, video_url=$2, updated_at=NOW() WHERE id=$3', [guid, videoUrl, lessonId]);
  return { videoUrl, guid };
};

const updateProgress = async (userId, lessonId, watchedSeconds) => {
  const { rows: [lesson] } = await query('SELECT duration_seconds FROM lessons WHERE id=$1', [lessonId]);
  if (!lesson) throw new AppError('Lesson not found', 404);
  const completed = lesson.duration_seconds > 0 && watchedSeconds >= lesson.duration_seconds * 0.9;
  await query(`
    INSERT INTO lesson_progress (user_id, lesson_id, watched_seconds, is_completed, completed_at)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
      watched_seconds = GREATEST(lesson_progress.watched_seconds, $3),
      is_completed = CASE WHEN $4 THEN true ELSE lesson_progress.is_completed END,
      completed_at = CASE WHEN $4 AND lesson_progress.completed_at IS NULL THEN NOW() ELSE lesson_progress.completed_at END,
      updated_at = NOW()
  `, [userId, lessonId, watchedSeconds, completed, completed ? 'NOW()' : null]);
  return { completed };
};

const remove = async (id, teacherId) => {
  return transaction(async (client) => {
    const { rows: [lesson] } = await client.query(`
      SELECT l.id, l.video_guid FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=$1 AND c.teacher_id=$2
    `, [id, teacherId]);
    if (!lesson) throw new AppError('Lesson not found', 404);

    // Delete in FK-safe order
    await client.query(`DELETE FROM test_attempt_answers WHERE question_id IN (
      SELECT tq.id FROM test_questions tq JOIN tests t ON t.id=tq.test_id WHERE t.lesson_id=$1
    )`, [id]);
    await client.query('DELETE FROM test_attempts WHERE test_id IN (SELECT id FROM tests WHERE lesson_id=$1)', [id]);
    await client.query(`DELETE FROM test_options WHERE question_id IN (
      SELECT tq.id FROM test_questions tq JOIN tests t ON t.id=tq.test_id WHERE t.lesson_id=$1
    )`, [id]);
    await client.query('DELETE FROM test_questions WHERE test_id IN (SELECT id FROM tests WHERE lesson_id=$1)', [id]);
    await client.query('DELETE FROM tests WHERE lesson_id=$1', [id]);
    await client.query('DELETE FROM lesson_progress WHERE lesson_id=$1', [id]);
    await client.query('DELETE FROM materials WHERE lesson_id=$1', [id]);
    await client.query('DELETE FROM assignments WHERE lesson_id=$1', [id]);
    await client.query('DELETE FROM lessons WHERE id=$1', [id]);

    // Delete video from Bunny.net if it exists
    if (lesson.video_guid) {
      try {
        const url = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/videos/${lesson.video_guid}.mp4`;
        await axios.delete(url, {
          headers: {
            AccessKey: process.env.BUNNY_API_KEY,
          },
        });
      } catch (e) {
        console.error(`Bunny.net video delete failed for ${lesson.video_guid}:`, e.message);
      }
    }

    return { deleted: true };
  });
};

module.exports = { listByCourse, get, create, update, remove, uploadVideoToBunny, updateProgress };
