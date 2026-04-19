const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { notify } = require('../../config/socket');

const create = async (lessonId, teacherId, data) => {
  const { rows: [lesson] } = await query(`
    SELECT l.id FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=$1 AND c.teacher_id=$2
  `, [lessonId, teacherId]);
  if (!lesson) throw new AppError('Lesson not found', 404);

  const { rows } = await query(`
    INSERT INTO assignments (lesson_id, title, description, deadline_days, submission_type)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [lessonId, data.title, data.description, data.deadlineDays || 3, data.submissionType || 'text']);
  return rows[0];
};

const update = async (id, teacherId, data) => {
  const { rows } = await query(`
    UPDATE assignments a SET title=COALESCE($1,title), description=COALESCE($2,description),
      deadline_days=COALESCE($3,deadline_days), submission_type=COALESCE($4,submission_type)
    FROM lessons l JOIN courses c ON c.id=l.course_id
    WHERE a.id=$5 AND l.id=a.lesson_id AND c.teacher_id=$6 RETURNING a.*
  `, [data.title, data.description, data.deadlineDays, data.submissionType, id, teacherId]);
  if (!rows[0]) throw new AppError('Assignment not found', 404);
  return rows[0];
};

const deleteAssignment = async (id, teacherId) => {
  const { rows: [asgn] } = await query(`
    DELETE FROM assignments a USING lessons l JOIN courses c ON c.id=l.course_id
    WHERE a.id=$1 AND l.id=a.lesson_id AND c.teacher_id=$2 RETURNING a.id
  `, [id, teacherId]);
  if (!asgn) throw new AppError('Assignment not found', 404);
  return { deleted: true };
};

const getByLesson = async (lessonId) => {
  const { rows } = await query(`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM assignment_submissions WHERE assignment_id=a.id) AS submission_count,
      (SELECT COUNT(*)::int FROM assignment_submissions WHERE assignment_id=a.id AND graded_at IS NOT NULL) AS graded_count
    FROM assignments a WHERE a.lesson_id=$1 ORDER BY a.created_at DESC
  `, [lessonId]);
  return rows;
};

const getWithSubmission = async (lessonId, userId) => {
  const { rows } = await query(`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM assignment_submissions WHERE assignment_id=a.id) AS submission_count,
      (SELECT COUNT(*)::int FROM assignment_submissions WHERE assignment_id=a.id AND graded_at IS NOT NULL) AS graded_count,
      s.id AS submission_id, s.content_text, s.file_url, s.submitted_at, s.score, s.graded_at, s.feedback
    FROM assignments a
    LEFT JOIN assignment_submissions s ON s.assignment_id=a.id AND s.user_id=$2
    WHERE a.lesson_id=$1 ORDER BY a.created_at DESC
  `, [lessonId, userId]);
  return rows;
};

const pending = async (teacherId) => {
  const { rows } = await query(`
    SELECT s.id, s.content_text, s.file_url, s.submitted_at, s.score, s.graded_at,
      u.first_name, u.last_name, u.id AS user_id,
      a.title AS assignment_title, a.id AS assignment_id,
      l.title AS lesson_title, c.title AS course_title
    FROM assignment_submissions s
    JOIN users u ON u.id = s.user_id
    JOIN assignments a ON a.id = s.assignment_id
    JOIN lessons l ON l.id = a.lesson_id
    JOIN courses c ON c.id = l.course_id
    WHERE c.teacher_id = $1 AND s.graded_at IS NULL
    ORDER BY s.submitted_at DESC
  `, [teacherId]);
  return rows;
};

const submit = async (userId, assignmentId, data) => {
  const { rows: [assignment] } = await query(`
    SELECT a.*, l.course_id FROM assignments a JOIN lessons l ON l.id=a.lesson_id WHERE a.id=$1
  `, [assignmentId]);
  if (!assignment) throw new AppError('Assignment not found', 404);

  const deadline = new Date(assignment.created_at);
  deadline.setDate(deadline.getDate() + assignment.deadline_days);
  if (new Date() > deadline) throw new AppError('Deadline passed', 400);

  const { rows } = await query(`
    INSERT INTO assignment_submissions (assignment_id, user_id, content_text, file_url)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (assignment_id, user_id) DO UPDATE
      SET content_text=$3, file_url=$4, submitted_at=NOW(), graded_at=NULL, score=NULL, feedback=NULL
    RETURNING *
  `, [assignmentId, userId, data.contentText, data.fileUrl]);
  return rows[0];
};

const grade = async (teacherId, submissionId, { score, feedback }) => {
  const { rows } = await query(`
    UPDATE assignment_submissions s SET score=$1, feedback=$2, graded_by=$3, graded_at=NOW()
    FROM assignments a JOIN lessons l ON l.id=a.lesson_id JOIN courses c ON c.id=l.course_id
    WHERE s.assignment_id=a.id AND c.teacher_id=$3 AND s.id=$4
    RETURNING s.*, s.user_id
  `, [score, feedback, teacherId, submissionId]);
  if (!rows[0]) throw new AppError('Submission not found', 404);
  notify(rows[0].user_id, 'assignment:graded', { submissionId, score, feedback });
  return rows[0];
};

module.exports = { create, update, deleteAssignment, getByLesson, getWithSubmission, pending, submit, grade };
