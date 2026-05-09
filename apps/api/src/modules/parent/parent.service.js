const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

async function linkParent(studentId, phone, name) {
  if (!phone || phone.trim().length === 0) throw new AppError('Phone is required', 400);

  const studentRes = await query('SELECT id FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
  if (studentRes.rows.length === 0) throw new AppError('Student not found', 404);

  const res = await query(`
    INSERT INTO parent_links (student_id, parent_phone, parent_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (parent_phone, student_id) DO UPDATE SET parent_name = $3
    RETURNING *
  `, [studentId, phone, name || null]);

  return res.rows[0];
}

async function getStudentStats(studentId) {
  const studentRes = await query('SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
  if (studentRes.rows.length === 0) throw new AppError('Student not found', 404);

  const student = studentRes.rows[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Attendance last 4 weeks
  const attendanceRes = await query(`
    SELECT
      COUNT(*) as total_classes,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count
    FROM attendance
    WHERE user_id = $1 AND created_at >= $2
  `, [studentId, fourWeeksAgo]);

  const attendance = attendanceRes.rows[0];
  const attendanceRate = attendance.total_classes > 0 ? (attendance.present_count / attendance.total_classes * 100).toFixed(1) : 0;

  // Test attempts average
  const testRes = await query(`
    SELECT AVG(score) as avg_score, COUNT(*) as test_count
    FROM test_attempts
    WHERE user_id = $1 AND created_at >= $2
  `, [studentId, thirtyDaysAgo]);

  const tests = testRes.rows[0];

  // Assignments
  const assignmentRes = await query(`
    SELECT COUNT(*) as submitted_count FROM assignment_submissions WHERE user_id = $1 AND created_at >= $2
  `, [studentId, thirtyDaysAgo]);

  // Daily grades average
  const gradesRes = await query(`
    SELECT AVG(grade) as avg_grade, COUNT(*) as grade_count
    FROM daily_grades
    WHERE user_id = $1 AND created_at >= $2
  `, [studentId, thirtyDaysAgo]);

  const grades = gradesRes.rows[0];

  return {
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
    },
    attendance: {
      rate: parseFloat(attendanceRate),
      present: attendance.present_count || 0,
      total: attendance.total_classes || 0,
    },
    tests: {
      count: tests.test_count || 0,
      avg_score: tests.avg_score ? parseFloat(tests.avg_score).toFixed(1) : 0,
    },
    assignments: {
      submitted: assignmentRes.rows[0].submitted_count || 0,
    },
    grades: {
      count: grades.grade_count || 0,
      avg_grade: grades.avg_grade ? parseFloat(grades.avg_grade).toFixed(2) : 0,
    },
  };
}

async function getLinkedStudents(phone) {
  if (!phone || phone.trim().length === 0) throw new AppError('Phone is required', 400);

  const res = await query(`
    SELECT
      pl.id,
      pl.student_id,
      u.first_name,
      u.last_name,
      u.email,
      pl.verified_at,
      pl.created_at
    FROM parent_links pl
    JOIN users u ON u.id = pl.student_id
    WHERE pl.parent_phone = $1
    ORDER BY pl.created_at DESC
  `, [phone]);

  return res.rows.map(row => ({
    id: row.id,
    student_id: row.student_id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    verified: row.verified_at !== null,
    linked_at: row.created_at,
  }));
}

module.exports = {
  linkParent,
  getStudentStats,
  getLinkedStudents,
};
