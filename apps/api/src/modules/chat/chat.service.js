const { query } = require('../../config/db');

const getContacts = async (userId, role) => {
  if (role === 'teacher') {
    const { rows } = await query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.role,
        (SELECT content FROM messages WHERE (sender_id=u.id AND receiver_id=$1) OR (sender_id=$1 AND receiver_id=u.id) ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*)::int FROM messages WHERE sender_id=u.id AND receiver_id=$1 AND is_read=false) AS unread_count
      FROM users u
      JOIN enrollments e ON e.user_id = u.id
      JOIN courses c ON c.id = e.course_id AND c.teacher_id = $1
      ORDER BY unread_count DESC, u.first_name
    `, [userId]);
    return rows;
  }
  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.role,
      (SELECT content FROM messages WHERE (sender_id=u.id AND receiver_id=$1) OR (sender_id=$1 AND receiver_id=u.id) ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*)::int FROM messages WHERE sender_id=u.id AND receiver_id=$1 AND is_read=false) AS unread_count
    FROM users u
    JOIN courses c ON c.teacher_id = u.id
    JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
    GROUP BY u.id ORDER BY u.first_name
  `, [userId]);
  return rows;
};

const getMessages = async (userId, contactId) => {
  await query('UPDATE messages SET is_read=true WHERE sender_id=$1 AND receiver_id=$2 AND is_read=false', [contactId, userId]);
  const { rows } = await query(`
    SELECT * FROM messages
    WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
    ORDER BY created_at ASC
  `, [userId, contactId]);
  return rows;
};

const send = async (senderId, receiverId, content) => {
  const { rows } = await query(`
    INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *
  `, [senderId, receiverId, content]);
  return rows[0];
};

module.exports = { getContacts, getMessages, send };
