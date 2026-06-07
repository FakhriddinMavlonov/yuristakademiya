const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Get weekly report data for a student
 */
const getWeeklyReport = async (studentId) => {
  const studentRes = await query(
    'SELECT id, first_name, last_name, parent_telegram_phone, parent_call_phone FROM users WHERE id = $1 AND role = $2',
    [studentId, 'student']
  );
  if (studentRes.rows.length === 0) throw new AppError('Student not found', 404);

  const student = studentRes.rows[0];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // === ONLINE DATA ===
  // Lesson progress (online)
  const lessonRes = await query(`
    SELECT
      COUNT(*) as total_lessons,
      SUM(CASE WHEN lp.is_completed = true THEN 1 ELSE 0 END) as completed_lessons,
      SUM(lp.watched_seconds) as total_watched_seconds
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = $1 AND lp.updated_at >= $2
  `, [studentId, oneWeekAgo]);

  // Test attempts (online)
  const testRes = await query(`
    SELECT
      COUNT(*) as total_attempts,
      AVG(score_pct) as avg_score,
      SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) as passed_count
    FROM test_attempts
    WHERE user_id = $1 AND submitted_at >= $2
  `, [studentId, oneWeekAgo]);

  // Assignment submissions (online)
  const assignmentRes = await query(`
    SELECT COUNT(*) as submitted
    FROM assignment_submissions
    WHERE user_id = $1 AND submitted_at >= $2
  `, [studentId, oneWeekAgo]);

  // === OFFLINE DATA ===
  // Attendance (offline)
  const attendanceRes = await query(`
    SELECT
      COUNT(*) as total_classes,
      SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'late' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
    FROM attendance
    WHERE user_id = $1 AND date >= $2 AND date <= $3
  `, [studentId, weekStart, today]);

  // Daily grades (offline)
  const gradesRes = await query(`
    SELECT
      COUNT(*) as grade_count,
      AVG(score) as avg_grade
    FROM daily_grades
    WHERE user_id = $1 AND date >= $2 AND date <= $3
  `, [studentId, weekStart, today]);

  // Mock exam results (offline)
  const examRes = await query(`
    SELECT
      COUNT(*) as exam_count,
      AVG(mer.score::numeric) as avg_score
    FROM mock_exam_results mer
    JOIN mock_exams me ON me.id = mer.exam_id
    WHERE mer.user_id = $1 AND mer.posted_at >= $2
  `, [studentId, oneWeekAgo]);

  // Groups the student belongs to (offline)
  const groupsRes = await query(`
    SELECT g.id, g.name, g.shift
    FROM groups g
    JOIN group_students gs ON gs.group_id = g.id
    WHERE gs.user_id = $1 AND g.status = 'active'
  `, [studentId]);

  // XP and level (gamification)
  const pointsRes = await query(`
    SELECT total_xp, current_level, daily_streak
    FROM user_points
    WHERE user_id = $1
  `, [studentId]);

  // === COMPUTE ===
  const lessons = lessonRes.rows[0];
  const tests = testRes.rows[0];
  const attendance = attendanceRes.rows[0];
  const grades = gradesRes.rows[0];
  const exams = examRes.rows[0];
  const points = pointsRes.rows[0];
  const groups = groupsRes.rows;

  const watchedMinutes = Math.round((parseInt(lessons.total_watched_seconds) || 0) / 60);

  return {
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
    },
    groups: groups.map(g => ({ id: g.id, name: g.name, shift: g.shift })),
    reportPeriod: {
      from: weekStart,
      to: today,
    },
    online: {
      lessons: {
        completed: parseInt(lessons.completed_lessons) || 0,
        total: parseInt(lessons.total_lessons) || 0,
        watchedMinutes,
      },
      tests: {
        attempts: parseInt(tests.total_attempts) || 0,
        avgScore: tests.avg_score ? parseFloat(tests.avg_score).toFixed(1) : 0,
        passed: parseInt(tests.passed_count) || 0,
      },
      assignments: {
        submitted: parseInt(assignmentRes.rows[0].submitted) || 0,
      },
    },
    offline: {
      attendance: {
        total: parseInt(attendance.total_classes) || 0,
        present: parseInt(attendance.present_count) || 0,
        absent: parseInt(attendance.absent_count) || 0,
        excused: parseInt(attendance.excused_count) || 0,
        rate: attendance.total_classes > 0
          ? ((parseInt(attendance.present_count) / parseInt(attendance.total_classes)) * 100).toFixed(1)
          : 0,
      },
      grades: {
        count: parseInt(grades.grade_count) || 0,
        avg: grades.avg_grade ? parseFloat(grades.avg_grade).toFixed(1) : 0,
      },
      exams: {
        count: parseInt(exams.exam_count) || 0,
        avgScore: exams.avg_score ? parseFloat(exams.avg_score).toFixed(1) : 0,
      },
    },
    gamification: {
      xp: points ? points.total_xp : 0,
      level: points ? points.current_level : 1,
      streak: points ? points.daily_streak : 0,
    },
  };
};

/**
 * Get all active parent report subscriptions with student + parent info
 */
const getActiveSubscriptions = async () => {
  const { rows } = await query(`
    SELECT
      prs.id,
      prs.parent_phone,
      prs.student_id,
      prs.telegram_chat_id,
      prs.frequency,
      prs.last_sent_at,
      u.first_name || ' ' || u.last_name AS student_name,
      COALESCE(prs.telegram_chat_id, (
        SELECT telegram_chat_id FROM users WHERE id = prs.student_id
      )) AS chat_id,
      u.parent_telegram_phone
    FROM parent_report_settings prs
    JOIN users u ON u.id = prs.student_id
    WHERE prs.is_active = true
      AND (
        prs.frequency = 'daily'
        OR (prs.frequency = 'weekly' AND (
          prs.last_sent_at IS NULL
          OR prs.last_sent_at < NOW() - INTERVAL '6 days'
        ))
        OR (prs.frequency = 'monthly' AND (
          prs.last_sent_at IS NULL
          OR prs.last_sent_at < NOW() - INTERVAL '25 days'
        ))
      )
    ORDER BY prs.last_sent_at ASC NULLS FIRST
    LIMIT 500
  `);
  return rows;
};

/**
 * Save report to log
 */
const saveReportLog = async (parentPhone, studentId, reportData) => {
  await query(
    `INSERT INTO parent_report_log (parent_phone, student_id, report_data)
     VALUES ($1, $2, $3)`,
    [parentPhone, studentId, JSON.stringify(reportData)]
  );
};

/**
 * Update last sent timestamp
 */
const updateLastSent = async (subscriptionId) => {
  await query(
    'UPDATE parent_report_settings SET last_sent_at = NOW(), updated_at = NOW() WHERE id = $1',
    [subscriptionId]
  );
};

/**
 * Subscribe or unsubscribe a parent to reports
 */
const setSubscription = async (parentPhone, studentId, settings) => {
  const { isActive, frequency, telegramChatId } = settings;

  if (frequency && !['daily', 'weekly', 'monthly'].includes(frequency)) {
    throw new AppError('Noto\'g\'ri chastota. daily, weekly yoki monthly bo\'lishi kerak', 400);
  }

  const existing = await query(
    'SELECT id FROM parent_report_settings WHERE parent_phone = $1 AND student_id = $2',
    [parentPhone, studentId]
  );

  if (existing.rows.length > 0) {
    const { rows } = await query(`
      UPDATE parent_report_settings SET
        is_active = COALESCE($3, is_active),
        frequency = COALESCE($4, frequency),
        telegram_chat_id = COALESCE($5, telegram_chat_id),
        updated_at = NOW()
      WHERE parent_phone = $1 AND student_id = $2
      RETURNING *
    `, [parentPhone, studentId, isActive, frequency, telegramChatId]);
    return rows[0];
  } else {
    const { rows } = await query(`
      INSERT INTO parent_report_settings (parent_phone, student_id, telegram_chat_id, is_active, frequency)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [parentPhone, studentId, telegramChatId, isActive ?? true, frequency ?? 'weekly']);
    return rows[0];
  }
};

/**
 * Get subscription status for a parent
 */
const getSubscription = async (parentPhone, studentId) => {
  const { rows } = await query(
    'SELECT * FROM parent_report_settings WHERE parent_phone = $1 AND student_id = $2',
    [parentPhone, studentId]
  );
  return rows[0] || null;
};

module.exports = {
  getWeeklyReport,
  getActiveSubscriptions,
  saveReportLog,
  updateLastSent,
  setSubscription,
  getSubscription,
};
