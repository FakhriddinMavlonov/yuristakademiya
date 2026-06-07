const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

async function getStudentAnalytics(studentId, teacherId = null) {
  const studentRes = await query('SELECT id FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
  if (studentRes.rows.length === 0) throw new AppError('Student not found', 404);

  if (teacherId) {
    const enrollmentRes = await query(
      'SELECT COUNT(*) as cnt FROM enrollments WHERE user_id = $1 AND (course_id IN (SELECT id FROM courses WHERE teacher_id = $2))',
      [studentId, teacherId]
    );
    if (enrollmentRes.rows[0].cnt === 0) throw new AppError('Unauthorized', 403);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Attendance rate per group
  const attendanceRes = await query(`
    SELECT
      g.id,
      g.name,
      COUNT(*) as total_classes,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count
    FROM groups g
    LEFT JOIN group_students gs ON g.id = gs.group_id AND gs.user_id = $1
    LEFT JOIN attendance a ON a.group_id = g.id AND a.user_id = $1 AND a.created_at >= $2
    WHERE gs.user_id = $1
    GROUP BY g.id, g.name
  `, [studentId, fourWeeksAgo]);

  const attendance = attendanceRes.rows.map(row => ({
    group: row.name,
    rate: row.total_classes > 0 ? (row.present_count / row.total_classes * 100).toFixed(1) : 0,
  }));

  // Avg test score by course
  const testRes = await query(`
    SELECT
      c.title,
      AVG(ta.score) as avg_score,
      COUNT(*) as test_count
    FROM test_attempts ta
    JOIN tests t ON ta.test_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE ta.user_id = $1 AND ta.created_at >= $2
    GROUP BY c.id, c.title
    ORDER BY c.title
  `, [studentId, thirtyDaysAgo]);

  const tests = testRes.rows.map(row => ({
    course: row.title,
    avg_score: parseFloat(row.avg_score).toFixed(1),
    test_count: row.test_count,
  }));

  // Lesson completion
  const lessonRes = await query(`
    SELECT
      COUNT(*) as total_lessons,
      SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) as completed
    FROM lesson_progress
    WHERE user_id = $1
  `, [studentId]);

  const lessons = lessonRes.rows[0];

  // Daily grades
  const gradesRes = await query(`
    SELECT AVG(score) as avg_grade FROM daily_grades WHERE user_id = $1 AND created_at >= $2
  `, [studentId, fourWeeksAgo]);

  const avgGrade = parseFloat(gradesRes.rows[0]?.avg_grade || 0).toFixed(2);

  // XP trend last 14 days (simulated from current user_points)
  const xpRes = await query('SELECT total_xp, daily_streak FROM user_points WHERE user_id = $1', [studentId]);
  const xpTrend = xpRes.rows[0] ? {
    total_xp: xpRes.rows[0].total_xp,
    daily_streak: xpRes.rows[0].daily_streak,
  } : { total_xp: 0, daily_streak: 0 };

  return {
    student_id: studentId,
    attendance,
    tests,
    lessons: {
      completed: lessons.completed || 0,
      total: lessons.total_lessons || 0,
      completion_rate: lessons.total_lessons > 0 ? ((lessons.completed / lessons.total_lessons) * 100).toFixed(1) : 0,
    },
    daily_grades: {
      avg: avgGrade,
    },
    xp: xpTrend,
  };
}

async function getTeacherAnalytics(teacherId) {
  // Groups stats
  const groupsRes = await query(`
    SELECT
      g.id,
      g.name,
      COUNT(DISTINCT gs.user_id) as student_count,
      AVG(dg.score) as avg_grade,
      COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.user_id END)::float / NULLIF(COUNT(DISTINCT a.user_id), 0) as attendance_rate
    FROM groups g
    LEFT JOIN group_students gs ON g.id = gs.group_id
    LEFT JOIN daily_grades dg ON dg.group_id = g.id
    LEFT JOIN attendance a ON a.group_id = g.id
    WHERE g.teacher_id = $1
    GROUP BY g.id, g.name
    ORDER BY g.name
  `, [teacherId]);

  const groups = groupsRes.rows.map(row => ({
    id: row.id,
    name: row.name,
    student_count: row.student_count || 0,
    avg_grade: row.avg_grade ? parseFloat(row.avg_grade).toFixed(2) : 0,
    attendance_rate: row.attendance_rate ? (parseFloat(row.attendance_rate) * 100).toFixed(1) : 0,
  }));

  // Top 5 students by XP
  const topRes = await query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      up.total_xp,
      up.daily_streak
    FROM user_points up
    JOIN users u ON u.id = up.user_id
    WHERE u.id IN (
      SELECT DISTINCT gs.user_id FROM group_students gs JOIN groups g ON g.id = gs.group_id WHERE g.teacher_id = $1
    )
    ORDER BY up.total_xp DESC
    LIMIT 5
  `, [teacherId]);

  const topStudents = topRes.rows.map(row => ({
    name: `${row.first_name} ${row.last_name}`,
    xp: row.total_xp,
    streak: row.daily_streak,
  }));

  // Bottom 5 students by XP
  const bottomRes = await query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      up.total_xp,
      up.daily_streak
    FROM user_points up
    JOIN users u ON u.id = up.user_id
    WHERE u.id IN (
      SELECT DISTINCT gs.user_id FROM group_students gs JOIN groups g ON g.id = gs.group_id WHERE g.teacher_id = $1
    )
    ORDER BY up.total_xp ASC
    LIMIT 5
  `, [teacherId]);

  const bottomStudents = bottomRes.rows.map(row => ({
    name: `${row.first_name} ${row.last_name}`,
    xp: row.total_xp,
    streak: row.daily_streak,
  }));

  // Assignment submission rate
  const assignmentRes = await query(`
    SELECT
      COUNT(DISTINCT a.id) as total_assignments,
      COUNT(DISTINCT asub.id) as submitted
    FROM assignments a
    LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
    WHERE a.course_id IN (SELECT id FROM courses WHERE teacher_id = $1)
  `, [teacherId]);

  const assignment = assignmentRes.rows[0];
  const submissionRate = assignment.total_assignments > 0 ? ((assignment.submitted / assignment.total_assignments) * 100).toFixed(1) : 0;

  return {
    teacher_id: teacherId,
    groups,
    top_students: topStudents,
    bottom_students: bottomStudents,
    assignment_submission_rate: parseFloat(submissionRate),
  };
}

module.exports = {
  getStudentAnalytics,
  getTeacherAnalytics,
};
