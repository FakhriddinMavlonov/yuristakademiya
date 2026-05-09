const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const list = async (teacherId) => {
  const { rows } = await query(`
    SELECT c.*, COUNT(cl.id)::int AS lesson_count
    FROM curricula c
    LEFT JOIN curriculum_lessons cl ON cl.curriculum_id = c.id
    WHERE c.teacher_id = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, [teacherId]);
  return rows;
};

const getDetail = async (id, teacherId) => {
  const { rows: [curriculum] } = await query(`
    SELECT * FROM curricula WHERE id = $1 AND teacher_id = $2
  `, [id, teacherId]);
  if (!curriculum) throw new AppError('Kurs reja topilmadi', 404);

  const { rows: lessons } = await query(`
    SELECT cl.*,
      COUNT(ct.id)::int AS task_count
    FROM curriculum_lessons cl
    LEFT JOIN curriculum_tasks ct ON ct.curriculum_lesson_id = cl.id
    WHERE cl.curriculum_id = $1
    GROUP BY cl.id
    ORDER BY cl.order_num
  `, [id]);

  const { rows: tasks } = await query(`
    SELECT * FROM curriculum_tasks
    WHERE curriculum_lesson_id = ANY($1::int[])
    ORDER BY curriculum_lesson_id, created_at
  `, [lessons.map(l => l.id)]);

  const lessonMap = {};
  lessons.forEach(l => {
    lessonMap[l.id] = { ...l, tasks: [] };
  });
  tasks.forEach(t => {
    if (lessonMap[t.curriculum_lesson_id]) {
      lessonMap[t.curriculum_lesson_id].tasks.push(t);
    }
  });

  return {
    ...curriculum,
    lessons: lessons.map(l => lessonMap[l.id]),
  };
};

const create = async (teacherId, data) => {
  const { rows: [curriculum] } = await query(`
    INSERT INTO curricula (name, description, teacher_id)
    VALUES ($1, $2, $3) RETURNING *
  `, [data.name, data.description || null, teacherId]);
  return curriculum;
};

const update = async (id, teacherId, data) => {
  const { rows: [curriculum] } = await query(`
    UPDATE curricula
    SET name = COALESCE($1, name),
        description = COALESCE($2, description)
    WHERE id = $3 AND teacher_id = $4
    RETURNING *
  `, [data.name ?? null, data.description ?? null, id, teacherId]);
  if (!curriculum) throw new AppError('Kurs reja topilmadi yoki ruxsatga ega emasiz', 404);
  return curriculum;
};

const remove = async (id, teacherId) => {
  const { rowCount } = await query(`
    DELETE FROM curricula WHERE id = $1 AND teacher_id = $2
  `, [id, teacherId]);
  if (rowCount === 0) throw new AppError('Kurs reja topilmadi yoki ruxsatga ega emasiz', 404);
  return { deleted: true };
};

const addLesson = async (curriculumId, teacherId, data) => {
  const { rows: [curriculum] } = await query(`
    SELECT id FROM curricula WHERE id = $1 AND teacher_id = $2
  `, [curriculumId, teacherId]);
  if (!curriculum) throw new AppError('Kurs reja topilmadi', 404);

  const { rows: [maxOrder] } = await query(`
    SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order
    FROM curriculum_lessons WHERE curriculum_id = $1
  `, [curriculumId]);

  const { rows: [lesson] } = await query(`
    INSERT INTO curriculum_lessons (curriculum_id, order_num, title, description)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [curriculumId, maxOrder.next_order, data.title, data.description || null]);
  return lesson;
};

const updateLesson = async (lessonId, data) => {
  const { rows: [lesson] } = await query(`
    UPDATE curriculum_lessons
    SET title = COALESCE($1, title),
        description = COALESCE($2, description)
    WHERE id = $3
    RETURNING *
  `, [data.title ?? null, data.description ?? null, lessonId]);
  if (!lesson) throw new AppError('Dars topilmadi', 404);
  return lesson;
};

const removeLesson = async (lessonId) => {
  const { rowCount } = await query(`
    DELETE FROM curriculum_lessons WHERE id = $1
  `, [lessonId]);
  if (rowCount === 0) throw new AppError('Dars topilmadi', 404);
  return { deleted: true };
};

const addTask = async (lessonId, data) => {
  const { rows: [lesson] } = await query(`
    SELECT id FROM curriculum_lessons WHERE id = $1
  `, [lessonId]);
  if (!lesson) throw new AppError('Dars topilmadi', 404);

  const { rows: [task] } = await query(`
    INSERT INTO curriculum_tasks (curriculum_lesson_id, type, title, description)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [lessonId, data.type || 'task', data.title, data.description || null]);
  return task;
};

const removeTask = async (taskId) => {
  const { rowCount } = await query(`
    DELETE FROM curriculum_tasks WHERE id = $1
  `, [taskId]);
  if (rowCount === 0) throw new AppError('Topshiriq topilmadi', 404);
  return { deleted: true };
};

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove,
  addLesson,
  updateLesson,
  removeLesson,
  addTask,
  removeTask,
};
