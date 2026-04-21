const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const axios = require('axios');
const path = require('path');

const toPublicUrl = (url) => {
  if (!url) return url;
  if (url.includes('storage.bunnycdn.com') && process.env.BUNNY_CDN_URL) {
    return url.replace(/^https?:\/\/[^/]*storage\.bunnycdn\.com\/[^/]+/, process.env.BUNNY_CDN_URL.replace(/\/$/, ''));
  }
  return url;
};

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
  return rows.map((r) => ({ ...r, file_url: toPublicUrl(r.file_url) }));
};

const upload = async (teacherId, data) => {
  const { rows } = await query(`
    INSERT INTO library_items (name, type, course_id, file_url, file_type, file_size_bytes, uploaded_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [data.name, data.type, data.courseId, data.fileUrl, data.fileType, data.fileSizeBytes, teacherId]);
  return rows[0];
};

const uploadFile = async (teacherId, fileBuffer, fileName, fileType) => {
  const ext = path.extname(fileName).substring(1).toLowerCase();
  const guid = `lib_${teacherId}_${Date.now()}.${ext}`;
  const uploadUrl = `https://${process.env.BUNNY_HOSTNAME}/${process.env.BUNNY_STORAGE_ZONE}/library/${guid}`;
  const publicUrl = `${process.env.BUNNY_CDN_URL}/library/${guid}`;

  await axios.put(uploadUrl, fileBuffer, {
    headers: {
      AccessKey: process.env.BUNNY_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
  });

  const { rows: [item] } = await query(`
    INSERT INTO library_items (name, type, file_url, file_type, file_size_bytes, uploaded_by)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  `, [fileName.replace(/\.[^.]+$/, ''), fileType, publicUrl, ext, fileBuffer.length, teacherId]);

  return item;
};

const remove = async (id, teacherId) => {
  const { rows } = await query('DELETE FROM library_items WHERE id=$1 AND uploaded_by=$2 RETURNING id', [id, teacherId]);
  if (!rows[0]) throw new AppError('Not found', 404);
  return { deleted: true };
};

module.exports = { list, upload, uploadFile, remove };
