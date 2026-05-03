const { query, transaction } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const list = async (userId, role, mode = null) => {
  const modeFilter = mode ? `AND c.mode = '${mode === 'offline' ? 'offline' : 'online'}'` : '';
  if (role === 'teacher') {
    const { rows } = await query(`
      SELECT c.*, COUNT(DISTINCT e.user_id)::int AS enrolled_count,
        ROUND(AVG(ta.score_pct),1) AS avg_score
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN tests t ON t.lesson_id = l.id
      LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.submitted_at IS NOT NULL
      WHERE c.teacher_id = $1 ${modeFilter}
      GROUP BY c.id ORDER BY c.created_at DESC
    `, [userId]);
    return rows;
  }
  const { rows } = await query(`
    SELECT c.*, u.first_name||' '||u.last_name AS teacher_name,
      e.enrolled_at,
      COUNT(DISTINCT l.id)::int AS lesson_count,
      COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed) ::int AS completed_lessons
    FROM courses c
    LEFT JOIN users u ON u.id = c.teacher_id
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
    LEFT JOIN lessons l ON l.course_id = c.id AND l.is_published
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
    WHERE c.status = 'published' ${modeFilter}
    GROUP BY c.id, u.first_name, u.last_name, e.enrolled_at
    ORDER BY e.enrolled_at DESC NULLS LAST, c.created_at DESC
  `, [userId]);
  return rows;
};

const create = async (teacherId, data) => {
  const mode = data.mode === 'offline' ? 'offline' : 'online';
  const { rows } = await query(`
    INSERT INTO courses (title, description, category, level, banner_gradient, teacher_id, status, mode)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
  `, [data.title, data.description, data.category, data.level, data.bannerGradient, teacherId, data.status || 'draft', mode]);
  return rows[0];
};

const get = async (id) => {
  const { rows: [course] } = await query('SELECT * FROM courses WHERE id=$1', [id]);
  if (!course) throw new AppError('Course not found', 404);
  return course;
};

const update = async (id, teacherId, data) => {
  const mode = data.mode && ['online', 'offline'].includes(data.mode) ? data.mode : null;
  const { rows } = await query(`
    UPDATE courses SET title=COALESCE($1,title), description=COALESCE($2,description),
      category=COALESCE($3,category), level=COALESCE($4,level),
      banner_gradient=COALESCE($5,banner_gradient), status=COALESCE($6,status),
      intro_video_url=COALESCE($7,intro_video_url),
      mode=COALESCE($8,mode),
      updated_at=NOW()
    WHERE id=$9 AND teacher_id=$10 RETURNING *
  `, [data.title, data.description, data.category, data.level, data.bannerGradient, data.status, data.introVideoUrl, mode, id, teacherId]);
  if (!rows[0]) throw new AppError('Course not found', 404);
  return rows[0];
};

const uploadIntroVideo = async (courseId, teacherId, fileBuffer, fileName) => {
  const axios = require('axios');
  const { rows: [course] } = await query(
    'SELECT id FROM courses WHERE id=$1 AND teacher_id=$2',
    [courseId, teacherId]
  );
  if (!course) throw new AppError('Course not found or unauthorized', 404);

  const guid = `course_intro_${courseId}_${Date.now()}`;
  const url = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/videos/${guid}.mp4`;

  await axios.put(url, fileBuffer, {
    headers: {
      AccessKey: process.env.BUNNY_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
  });

  const videoUrl = `${process.env.BUNNY_CDN_URL}/videos/${guid}.mp4`;
  await query('UPDATE courses SET intro_video_url=$1, updated_at=NOW() WHERE id=$2', [videoUrl, courseId]);
  return { videoUrl, guid };
};

const enroll = async (userId, courseId) => {
  const { rows: [course] } = await query("SELECT id FROM courses WHERE id=$1 AND status='published'", [courseId]);
  if (!course) throw new AppError('Course not found', 404);
  await query('INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, courseId]);
  return { enrolled: true };
};

const studentStats = async (courseId, teacherId) => {
  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.email,
      COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed) ::int AS completed_lessons,
      COUNT(DISTINCT l.id)::int AS total_lessons,
      ROUND(AVG(ta.score_pct) FILTER (WHERE ta.submitted_at IS NOT NULL), 1) AS avg_score,
      MAX(lp.updated_at) AS last_activity
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN lessons l ON l.course_id = c.id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = u.id
    LEFT JOIN tests t ON t.lesson_id = l.id
    LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.user_id = u.id
    WHERE e.course_id = $1 AND c.teacher_id = $2
    GROUP BY u.id ORDER BY avg_score DESC NULLS LAST
  `, [courseId, teacherId]);
  return rows;
};

const getStudentDetail = async (studentId, teacherId) => {
  const { rows: [student] } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.telegram_chat_id,
      u.second_phone, u.third_phone, u.is_active, u.created_at,
      COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed) ::int AS completed_lessons,
      COUNT(DISTINCT l.id)::int AS total_lessons,
      ROUND(AVG(ta.score_pct) FILTER (WHERE ta.submitted_at IS NOT NULL), 1) AS avg_score
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
    LEFT JOIN courses c ON c.id = e.course_id AND c.teacher_id = $2
    LEFT JOIN lessons l ON l.course_id = c.id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = u.id
    LEFT JOIN tests t ON t.lesson_id = l.id
    LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.user_id = u.id
    WHERE u.id = $1
    GROUP BY u.id
  `, [studentId, teacherId]);
  if (!student) throw new AppError('Student not found', 404);

  const { rows: attempts } = await query(`
    SELECT ta.id, ta.test_id, ta.score_pct, ta.submitted_at, t.lesson_id, l.title AS lesson_title
    FROM test_attempts ta
    JOIN tests t ON t.id = ta.test_id
    JOIN lessons l ON l.id = t.lesson_id
    JOIN courses c ON c.id = l.course_id AND c.teacher_id = $2
    WHERE ta.user_id = $1 AND ta.submitted_at IS NOT NULL
    ORDER BY ta.submitted_at DESC
    LIMIT 20
  `, [studentId, teacherId]);

  return { ...student, test_attempts: attempts };
};

const getTeacherStudents = async (teacherId) => {
  const { rows } = await query(`
    SELECT DISTINCT ON (u.id)
      u.id, u.first_name, u.last_name, u.phone, u.email, u.is_active,
      u.created_at AS registered_at,
      c.title AS course_title, c.id AS course_id,
      COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed) ::int AS completed_lessons,
      COUNT(DISTINCT l.id)::int AS total_lessons,
      ROUND(AVG(ta.score_pct) FILTER (WHERE ta.submitted_at IS NOT NULL), 1) AS avg_score,
      MAX(lp.updated_at) AS last_activity
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id AND c.teacher_id = $1
    LEFT JOIN lessons l ON l.course_id = c.id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = u.id
    LEFT JOIN tests t ON t.lesson_id = l.id
    LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.user_id = u.id
    GROUP BY u.id, c.id
    ORDER BY u.id, last_activity DESC NULLS LAST
  `, [teacherId]);
  return rows;
};

const remove = async (id, teacherId) => {
  return transaction(async (client) => {
    const { rows: [course] } = await client.query('SELECT id FROM courses WHERE id=$1 AND teacher_id=$2', [id, teacherId]);
    if (!course) throw new AppError('Course not found', 404);

    // Delete in FK-safe order: answers → attempts → options → questions → tests → lesson data → lessons → enrollments → course
    await client.query(`DELETE FROM test_attempt_answers WHERE question_id IN (
      SELECT tq.id FROM test_questions tq JOIN tests t ON t.id=tq.test_id JOIN lessons l ON l.id=t.lesson_id WHERE l.course_id=$1
    )`, [id]);
    await client.query(`DELETE FROM test_attempts WHERE test_id IN (
      SELECT t.id FROM tests t JOIN lessons l ON l.id=t.lesson_id WHERE l.course_id=$1
    )`, [id]);
    await client.query(`DELETE FROM test_options WHERE question_id IN (
      SELECT tq.id FROM test_questions tq JOIN tests t ON t.id=tq.test_id JOIN lessons l ON l.id=t.lesson_id WHERE l.course_id=$1
    )`, [id]);
    await client.query(`DELETE FROM test_questions WHERE test_id IN (
      SELECT t.id FROM tests t JOIN lessons l ON l.id=t.lesson_id WHERE l.course_id=$1
    )`, [id]);
    await client.query(`DELETE FROM tests WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=$1)`, [id]);
    await client.query(`DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=$1)`, [id]);
    await client.query(`DELETE FROM materials WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=$1)`, [id]);
    await client.query(`DELETE FROM assignments WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=$1)`, [id]);
    await client.query('DELETE FROM lessons WHERE course_id=$1', [id]);
    await client.query('DELETE FROM enrollments WHERE course_id=$1', [id]);
    await client.query('DELETE FROM courses WHERE id=$1', [id]);
    return { deleted: true };
  });
};

// List offline students that this teacher personally registered
const listOfflineStudents = async (teacherId) => {
  const { rows } = await query(`
    SELECT id, first_name, last_name, phone, second_phone, is_active, created_at
    FROM users
    WHERE created_by=$1 AND role='student'
    ORDER BY first_name, last_name
  `, [teacherId]);
  return rows;
};

// Teacher registers a new offline student (pre-verified, belongs to this teacher)
const registerOfflineStudent = async (teacherId, data) => {
  const { firstName, lastName, phone, password, secondPhone } = data;
  if (!firstName || !lastName || !phone || !password) {
    throw new AppError('Barcha maydonlarni to\'ldiring', 400);
  }
  if (password.length < 6) throw new AppError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 400);

  const bcrypt = require('bcryptjs');
  const normalizeP = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 9) return '+998' + d;
    if (d.length === 12 && d.startsWith('998')) return '+' + d;
    return '+' + d;
  };
  const normalizedPhone = normalizeP(phone);
  const secondNorm = secondPhone ? normalizeP(secondPhone) : null;

  const exists = await query('SELECT id FROM users WHERE phone=$1', [normalizedPhone]);
  if (exists.rows[0]) throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 409);

  const hash = await bcrypt.hash(password, 10);
  const { rows: [user] } = await query(`
    INSERT INTO users (first_name, last_name, phone, second_phone, password_hash, role, is_verified, is_active, created_by)
    VALUES ($1,$2,$3,$4,$5,'student',true,true,$6)
    RETURNING id, first_name, last_name, phone, second_phone, is_active, created_at
  `, [firstName, lastName, normalizedPhone, secondNorm, hash, teacherId]);
  return user;
};

module.exports = { list, get, create, update, uploadIntroVideo, remove, enroll, studentStats, getTeacherStudents, getStudentDetail, listOfflineStudents, registerOfflineStudent };
