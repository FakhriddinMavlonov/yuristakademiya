const { query } = require('../../config/db');
const { isUserOnline, notify } = require('../../config/socket');
const { sendBotMessage } = require('../../config/telegram');

const getContacts = async (userId, role) => {
  if (role === 'teacher') {
    const { rows } = await query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.role,
        (SELECT content FROM messages WHERE (sender_id=u.id AND receiver_id=$1) OR (sender_id=$1 AND receiver_id=u.id) ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*)::int FROM messages WHERE sender_id=u.id AND receiver_id=$1 AND is_read=false) AS unread_count
      FROM users u
      JOIN enrollments e ON e.user_id = u.id
      JOIN courses c ON c.id = e.course_id AND c.teacher_id = $1

      UNION

      SELECT u.id, u.first_name, u.last_name, u.role,
        (SELECT content FROM messages WHERE (sender_id=u.id AND receiver_id=$1) OR (sender_id=$1 AND receiver_id=u.id) ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*)::int FROM messages WHERE sender_id=u.id AND receiver_id=$1 AND is_read=false) AS unread_count
      FROM users u
      WHERE u.created_by = $1 AND u.role = 'student'

      ORDER BY unread_count DESC, first_name
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
  const msg = rows[0];

  // Real-time push to receiver if their socket is connected
  notify(receiverId, 'chat:message', { from: senderId, content, createdAt: msg.created_at });

  // If receiver is OFFLINE, fall back to Telegram notification
  notifyChatOnTelegram(senderId, receiverId, content).catch((e) =>
    console.error('[chat] telegram notify failed:', e.message)
  );

  return msg;
};

const notifyChatOnTelegram = async (senderId, receiverId, content) => {
  const online = await isUserOnline(receiverId);
  if (online) return; // they'll see the socket event

  const { rows: [pair] } = await query(`
    SELECT
      s.first_name AS s_first, s.last_name AS s_last, s.role AS s_role,
      r.first_name AS r_first, r.last_name AS r_last, r.telegram_chat_id
    FROM users s, users r
    WHERE s.id=$1 AND r.id=$2
  `, [senderId, receiverId]);
  if (!pair?.telegram_chat_id) return;

  const time = new Date().toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
  const senderRole = pair.s_role === 'teacher' ? 'ustoz' : pair.s_role === 'admin' ? 'admin' : "o'quvchi";
  const senderName = `${pair.s_first} ${pair.s_last}`;
  const receiverName = `${pair.r_first} ${pair.r_last}`;

  const text = pair.s_role === 'teacher'
    ? `${receiverName}, sizga ustoz ${senderName}dan yangi xabar bor.\nSoat ${time} da yuborildi.`
    : `Ustoz ${receiverName}, sizning o'quvchingiz ${senderName}dan yangi xabar bor.\nSoat ${time} da yuborildi.`;

  const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  await sendBotMessage(pair.telegram_chat_id, text, {
    reply_markup: {
      inline_keyboard: [[{
        text: '💬 Tizimga kirish',
        url: `${webUrl}/${pair.s_role === 'teacher' ? 'student' : 'teacher'}/chat`,
      }]],
    },
  });
};

module.exports = { getContacts, getMessages, send };
