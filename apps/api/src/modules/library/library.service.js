const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const list = async (teacherId, { type, courseId, search } = {}) => {
  let sql = `SELECT li.*, u.first_name||' '||u.last_name AS uploader_name, c.title AS course_title
    FROM library_items li
    LEFT JOIN users u ON u.id = li.uploaded_by
    LEFT JOIN courses c ON c.id = li.course_id
    WHERE li.uploaded_by = $1`;
  const params = [teacherId];
  if (type) { sql += ` AND li.type=$${params.length + 1}`; params.push(type); }
  if (courseId) { sql += ` AND li.course_id=$${params.length + 1}`; params.push(courseId); }
  if (search) { sql += ` AND li.name ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
  sql += ' ORDER BY li.created_at DESC';
  const { rows } = await query(sql, params);
  return rows;
};

const upload = async (teacherId, data) => {
  const { rows } = await query(`
    INSERT INTO library_items (name, type, course_id, file_url, file_type, file_size_bytes, uploaded_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [data.name, data.type, data.courseId, data.fileUrl, data.fileType, data.fileSizeBytes, teacherId]);
  return rows[0];
};

const remove = async (id, teacherId) => {
  const { rows } = await query('DELETE FROM library_items WHERE id=$1 AND uploaded_by=$2 RETURNING id', [id, teacherId]);
  if (!rows[0]) throw new AppError('Not found', 404);
  return { deleted: true };
};

module.exports = { list, upload, remove };
