const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const list = async (userId, role) => {
  if (role === 'admin') {
    const { rows } = await query(`
      SELECT g.*,
        c.title AS course_title,
        u.first_name || ' ' || u.last_name AS teacher_name,
        COUNT(DISTINCT gs.user_id)::int AS student_count
      FROM groups g
      LEFT JOIN courses c ON c.id = g.course_id
      LEFT JOIN users u ON u.id = g.teacher_id
      LEFT JOIN group_students gs ON gs.group_id = g.id
      GROUP BY g.id, c.title, u.first_name, u.last_name
      ORDER BY g.created_at DESC
    `);
    return rows;
  }
  if (role === 'teacher') {
    const { rows } = await query(`
      SELECT g.*,
        c.title AS course_title,
        COUNT(DISTINCT gs.user_id)::int AS student_count
      FROM groups g
      LEFT JOIN courses c ON c.id = g.course_id
      LEFT JOIN group_students gs ON gs.group_id = g.id
      WHERE g.teacher_id = $1
      GROUP BY g.id, c.title
      ORDER BY g.created_at DESC
    `, [userId]);
    return rows;
  }
  // student
  const { rows } = await query(`
    SELECT g.*,
      c.title AS course_title,
      u.first_name || ' ' || u.last_name AS teacher_name,
      COUNT(DISTINCT gs2.user_id)::int AS student_count
    FROM group_students gs
    JOIN groups g ON g.id = gs.group_id
    LEFT JOIN courses c ON c.id = g.course_id
    LEFT JOIN users u ON u.id = g.teacher_id
    LEFT JOIN group_students gs2 ON gs2.group_id = g.id
    WHERE gs.user_id = $1
    GROUP BY g.id, c.title, u.first_name, u.last_name
    ORDER BY g.created_at DESC
  `, [userId]);
  return rows;
};

const getDetail = async (groupId, userId, role) => {
  const { rows: [group] } = await query(`
    SELECT g.*,
      c.title AS course_title,
      u.first_name || ' ' || u.last_name AS teacher_name
    FROM groups g
    LEFT JOIN courses c ON c.id = g.course_id
    LEFT JOIN users u ON u.id = g.teacher_id
    WHERE g.id = $1
  `, [groupId]);
  if (!group) throw new AppError('Group not found', 404);
  if (role === 'teacher' && group.teacher_id !== userId) throw new AppError('Forbidden', 403);

  const { rows: students } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.phone, gs.joined_at,
      COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present_count,
      COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late_count,
      COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent_count,
      COUNT(a.id)::int AS total_marked,
      CASE WHEN COUNT(a.id) > 0
        THEN ROUND((COUNT(a.id) FILTER (WHERE a.status IN ('present','late'))::numeric / COUNT(a.id)) * 100)
        ELSE 0
      END AS attendance_rate
    FROM group_students gs
    JOIN users u ON u.id = gs.user_id
    LEFT JOIN attendance a ON a.user_id = u.id AND a.group_id = $1
    WHERE gs.group_id = $1
    GROUP BY u.id, u.first_name, u.last_name, u.phone, gs.joined_at
    ORDER BY u.first_name
  `, [groupId]);

  const { rows: schedule } = await query(
    'SELECT * FROM schedule_slots WHERE group_id = $1 ORDER BY weekday, start_time',
    [groupId]
  );

  return { ...group, students, schedule };
};

const create = async (data, actorId, actorRole) => {
  // Teachers can only create groups for themselves
  const teacherId = actorRole === 'teacher' ? actorId : (data.teacherId || null);
  const { rows: [group] } = await query(`
    INSERT INTO groups (name, course_id, teacher_id, start_date, end_date, shift, capacity, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING *
  `, [
    data.name,
    data.courseId || null,
    teacherId,
    data.startDate || new Date().toISOString().split('T')[0],
    data.endDate || null,
    data.shift || 'morning',
    data.capacity || 25,
  ]);
  return group;
};

const update = async (groupId, data, actorId, actorRole) => {
  // Teachers can only update their own groups and cannot reassign teacher_id
  if (actorRole === 'teacher') {
    const { rows: [group] } = await query('SELECT id FROM groups WHERE id=$1 AND teacher_id=$2', [groupId, actorId]);
    if (!group) throw new AppError('Group not found or forbidden', 404);
  }
  const { rows: [updated] } = await query(`
    UPDATE groups SET
      name        = COALESCE($1, name),
      course_id   = COALESCE($2, course_id),
      teacher_id  = COALESCE($3, teacher_id),
      start_date  = COALESCE($4, start_date),
      end_date    = COALESCE($5, end_date),
      shift       = COALESCE($6, shift),
      capacity    = COALESCE($7, capacity),
      status      = COALESCE($8, status)
    WHERE id=$9 RETURNING *
  `, [
    data.name ?? null,
    data.courseId ?? null,
    actorRole === 'teacher' ? null : (data.teacherId ?? null),
    data.startDate ?? null, data.endDate ?? null, data.shift ?? null,
    data.capacity ?? null, data.status ?? null,
    groupId,
  ]);
  if (!updated) throw new AppError('Group not found', 404);
  return updated;
};

const remove = async (groupId, actorId, actorRole) => {
  const ownerCheck = actorRole === 'teacher' ? 'AND teacher_id=$2' : '';
  const params = actorRole === 'teacher' ? [groupId, actorId] : [groupId];
  await query(`DELETE FROM groups WHERE id=$1 ${ownerCheck}`, params);
  return { deleted: true };
};

const addStudent = async (groupId, studentId, actorId, actorRole) => {
  if (actorRole === 'teacher') {
    // Teacher can only add students they created
    const { rows: [student] } = await query(
      'SELECT id FROM users WHERE id=$1 AND created_by=$2',
      [studentId, actorId]
    );
    if (!student) throw new AppError('Bu o\'quvchi sizga tegishli emas', 403);
    // Verify this group belongs to the teacher
    const { rows: [group] } = await query('SELECT id FROM groups WHERE id=$1 AND teacher_id=$2', [groupId, actorId]);
    if (!group) throw new AppError('Bu guruh sizga tegishli emas', 403);
  }
  await query(
    'INSERT INTO group_students (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [groupId, studentId]
  );
  return { added: true };
};

const removeStudent = async (groupId, studentId, actorId, actorRole) => {
  if (actorRole === 'teacher') {
    const { rows: [group] } = await query('SELECT id FROM groups WHERE id=$1 AND teacher_id=$2', [groupId, actorId]);
    if (!group) throw new AppError('Bu guruh sizga tegishli emas', 403);
  }
  await query('DELETE FROM group_students WHERE group_id=$1 AND user_id=$2', [groupId, studentId]);
  return { removed: true };
};

const setSchedule = async (groupId, slots) => {
  await query('DELETE FROM schedule_slots WHERE group_id=$1', [groupId]);
  for (const s of slots) {
    await query(
      'INSERT INTO schedule_slots (group_id, weekday, start_time, end_time, room) VALUES ($1,$2,$3,$4,$5)',
      [groupId, s.weekday, s.startTime, s.endTime, s.room || 'Online']
    );
  }
  const { rows } = await query(
    'SELECT * FROM schedule_slots WHERE group_id=$1 ORDER BY weekday, start_time',
    [groupId]
  );
  return rows;
};

const getGroupLessons = async (groupId, role, userId) => {
  let where = `WHERE gl.group_id = $1`;
  if (role === 'student') {
    where += ` AND gl.is_completed = true`;
  }
  const { rows } = await query(`
    SELECT gl.*,
      COUNT(glm.id)::int AS material_count
    FROM group_lessons gl
    LEFT JOIN group_lesson_materials glm ON glm.group_lesson_id = gl.id
    ${where}
    GROUP BY gl.id
    ORDER BY gl.order_num
  `, [groupId]);

  for (const lesson of rows) {
    const { rows: materials } = await query(`
      SELECT * FROM group_lesson_materials WHERE group_lesson_id = $1 ORDER BY created_at
    `, [lesson.id]);
    lesson.materials = materials;
  }

  return rows;
};

const applyCurriculum = async (groupId, curriculumId, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT id FROM groups WHERE id = $1 AND teacher_id = $2
  `, [groupId, teacherId]);
  if (!group) throw new AppError('Guruh topilmadi yoki ruxsatga ega emasiz', 403);

  const { rows: lessons } = await query(`
    SELECT * FROM curriculum_lessons WHERE curriculum_id = $1 ORDER BY order_num
  `, [curriculumId]);
  if (lessons.length === 0) return [];

  const { rows: [maxOrder] } = await query(`
    SELECT COALESCE(MAX(order_num), 0) AS max_order FROM group_lessons WHERE group_id = $1
  `, [groupId]);

  const newLessons = [];
  for (let i = 0; i < lessons.length; i++) {
    const cl = lessons[i];
    const { rows: [newLesson] } = await query(`
      INSERT INTO group_lessons (group_id, curriculum_lesson_id, order_num, title, description)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [groupId, cl.id, maxOrder.max_order + i + 1, cl.title, cl.description]);
    newLessons.push(newLesson);
  }

  return newLessons;
};

const addGroupLesson = async (groupId, data, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT id FROM groups WHERE id = $1 AND teacher_id = $2
  `, [groupId, teacherId]);
  if (!group) throw new AppError('Guruh topilmadi yoki ruxsatga ega emasiz', 403);

  const { rows: [maxOrder] } = await query(`
    SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order FROM group_lessons WHERE group_id = $1
  `, [groupId]);

  const { rows: [lesson] } = await query(`
    INSERT INTO group_lessons (group_id, order_num, title, description)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [groupId, maxOrder.next_order, data.title, data.description || null]);
  return lesson;
};

const updateGroupLesson = async (lessonId, data, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT g.id FROM groups g
    JOIN group_lessons gl ON gl.group_id = g.id
    WHERE gl.id = $1 AND g.teacher_id = $2
  `, [lessonId, teacherId]);
  if (!group) throw new AppError('Dars topilmadi yoki ruxsatga ega emasiz', 403);

  const { rows: [lesson] } = await query(`
    UPDATE group_lessons
    SET title = COALESCE($1, title),
        description = COALESCE($2, description),
        extra_tasks = COALESCE($3, extra_tasks)
    WHERE id = $4 RETURNING *
  `, [data.title ?? null, data.description ?? null, data.extraTasks ?? null, lessonId]);
  return lesson;
};

const uploadGroupLessonVideo = async (lessonId, fileBuffer, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT g.id FROM groups g
    JOIN group_lessons gl ON gl.group_id = g.id
    WHERE gl.id = $1 AND g.teacher_id = $2
  `, [lessonId, teacherId]);
  if (!group) throw new AppError('Dars topilmadi yoki ruxsatga ega emasiz', 403);

  const axios = require('axios');
  const guid = `lesson_${lessonId}_${Date.now()}`;
  const videoUrl = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/videos/${guid}.mp4`;

  await axios.put(videoUrl, fileBuffer, {
    headers: { AccessKey: process.env.BUNNY_API_KEY },
  });

  const { rows: [lesson] } = await query(`
    UPDATE group_lessons SET video_url = $1, video_guid = $2 WHERE id = $3 RETURNING *
  `, [videoUrl, guid, lessonId]);
  return lesson;
};

const addGroupLessonMaterial = async (lessonId, fileBuffer, name, fileType, fileSize, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT g.id FROM groups g
    JOIN group_lessons gl ON gl.group_id = g.id
    WHERE gl.id = $1 AND g.teacher_id = $2
  `, [lessonId, teacherId]);
  if (!group) throw new AppError('Dars topilmadi yoki ruxsatga ega emasiz', 403);

  const axios = require('axios');
  const guid = `material_${lessonId}_${Date.now()}`;
  const fileUrl = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/materials/${guid}`;

  await axios.put(fileUrl, fileBuffer, {
    headers: { AccessKey: process.env.BUNNY_API_KEY },
  });

  const { rows: [material] } = await query(`
    INSERT INTO group_lesson_materials (group_lesson_id, name, file_url, file_type, file_size_bytes)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [lessonId, name, fileUrl, fileType, fileSize]);
  return material;
};

const completeGroupLesson = async (lessonId, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT g.id FROM groups g
    JOIN group_lessons gl ON gl.group_id = g.id
    WHERE gl.id = $1 AND g.teacher_id = $2
  `, [lessonId, teacherId]);
  if (!group) throw new AppError('Dars topilmadi yoki ruxsatga ega emasiz', 403);

  const { rows: [lesson] } = await query(`
    UPDATE group_lessons SET is_completed = true, completed_at = NOW() WHERE id = $1 RETURNING *
  `, [lessonId]);
  return lesson;
};

const removeGroupLesson = async (lessonId, teacherId) => {
  const { rows: [group] } = await query(`
    SELECT g.id FROM groups g
    JOIN group_lessons gl ON gl.group_id = g.id
    WHERE gl.id = $1 AND g.teacher_id = $2
  `, [lessonId, teacherId]);
  if (!group) throw new AppError('Dars topilmadi yoki ruxsatga ega emasiz', 403);

  const { rows: [lesson] } = await query(`
    SELECT video_guid FROM group_lessons WHERE id = $1
  `, [lessonId]);

  if (lesson?.video_guid) {
    try {
      const axios = require('axios');
      const videoUrl = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/videos/${lesson.video_guid}.mp4`;
      await axios.delete(videoUrl, {
        headers: { AccessKey: process.env.BUNNY_API_KEY },
      });
    } catch (e) {
      console.error('[groups] Failed to delete video from BunnyCDN:', e.message);
    }
  }

  await query(`DELETE FROM group_lessons WHERE id = $1`, [lessonId]);
  return { deleted: true };
};

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove,
  addStudent,
  removeStudent,
  setSchedule,
  getGroupLessons,
  applyCurriculum,
  addGroupLesson,
  updateGroupLesson,
  uploadGroupLessonVideo,
  addGroupLessonMaterial,
  completeGroupLesson,
  removeGroupLesson,
};
