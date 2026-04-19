const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const getStats = async () => {
  const { rows: [stats] } = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='admin') as admin_count,
      (SELECT COUNT(*) FROM users WHERE role='teacher') as teacher_count,
      (SELECT COUNT(*) FROM users WHERE role='student') as student_count,
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM enrollments) as total_enrolled,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status='paid') as total_revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM salaries WHERE status='paid') as total_salaries_paid
  `);
  return stats;
};

const getStudentStats = async () => {
  const { rows } = await query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.second_phone,
      u.third_phone,
      u.telegram_chat_id,
      u.is_active,
      (SELECT COUNT(*) FROM enrollments WHERE user_id=u.id) as enrolled_courses,
      (SELECT COUNT(*) FROM lesson_progress WHERE user_id=u.id AND is_completed=true) as completed_lessons,
      (SELECT COUNT(*) FROM enrollments e JOIN lessons l ON l.course_id=e.course_id WHERE e.user_id=u.id) as total_lessons,
      (SELECT MAX(created_at) FROM payments WHERE user_id=u.id AND status='paid') as last_payment_date,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE user_id=u.id AND status='paid') as total_paid
    FROM users u
    WHERE u.role='student'
    ORDER BY u.created_at DESC
  `);
  return rows;
};

const getTeacherStats = async () => {
  const { rows } = await query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.telegram_chat_id,
      u.is_active,
      (SELECT COUNT(*) FROM courses WHERE teacher_id=u.id) as course_count,
      (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.teacher_id=u.id) as student_count,
      (SELECT COALESCE(ROUND(SUM(CAST(l.duration_seconds AS BIGINT)) / 1024.0 / 1024.0 / 1024.0, 2), 0)
        FROM lessons l JOIN courses c ON c.id=l.course_id WHERE c.teacher_id=u.id AND l.video_guid IS NOT NULL) as total_video_gb
    FROM users u
    WHERE u.role='teacher'
    ORDER BY u.created_at DESC
  `);
  return rows;
};

const listUsers = async (search, role) => {
  let query_str = `
    SELECT id, first_name, last_name, email, phone, role, is_active, created_at
    FROM users
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    const searchPattern = `%${search}%`;
    query_str += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (role && role !== 'all') {
    query_str += ` AND role=$${params.length + 1}`;
    params.push(role);
  }

  query_str += ` ORDER BY created_at DESC`;

  const { rows } = await query(query_str, params);
  return rows;
};

const createUser = async ({ firstName, lastName, phone, secondPhone, thirdPhone, password, role }) => {
  if (!firstName || !lastName || !phone || !password) {
    throw new AppError('Barcha maydonlarni to\'ldiring', 400);
  }
  if (!['teacher', 'student'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const normalizedPhone = normalizePhone(phone);
  const normalizedSecondPhone = secondPhone ? normalizePhone(secondPhone) : null;
  const normalizedThirdPhone = thirdPhone ? normalizePhone(thirdPhone) : null;

  const exists = await query('SELECT id FROM users WHERE phone=$1 OR phone=$2 OR phone=$3', [normalizedPhone, normalizedSecondPhone, normalizedThirdPhone].filter(Boolean));
  if (exists.rows[0]) {
    throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 409);
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows: [user] } = await query(
    `INSERT INTO users (first_name, last_name, phone, second_phone, third_phone, password_hash, role, is_verified, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) RETURNING id, first_name, last_name, email, phone, second_phone, third_phone, role, is_active, created_at`,
    [firstName, lastName, normalizedPhone, normalizedSecondPhone, normalizedThirdPhone, hash, role]
  );

  return user;
};

const updateUser = async (userId, data) => {
  const { firstName, lastName, phone, email } = data;
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (firstName) {
    updates.push(`first_name=$${paramIndex++}`);
    params.push(firstName);
  }
  if (lastName) {
    updates.push(`last_name=$${paramIndex++}`);
    params.push(lastName);
  }
  if (phone) {
    updates.push(`phone=$${paramIndex++}`);
    params.push(normalizePhone(phone));
  }
  if (email) {
    updates.push(`email=$${paramIndex++}`);
    params.push(email);
  }

  if (updates.length === 0) throw new AppError('No fields to update', 400);

  updates.push(`updated_at=NOW()`);
  params.push(userId);

  const { rows: [user] } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id=$${paramIndex} RETURNING id, first_name, last_name, email, phone, role, is_active, created_at`,
    params
  );

  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateUserRole = async (userId, role) => {
  if (!['teacher', 'student', 'admin'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const { rows: [user] } = await query(
    'UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING id, first_name, last_name, email, phone, role, is_active, created_at',
    [role, userId]
  );

  if (!user) throw new AppError('User not found', 404);
  return user;
};

const toggleUserActive = async (userId) => {
  const { rows: [user] } = await query(
    'UPDATE users SET is_active = NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id, first_name, last_name, email, phone, role, is_active, created_at',
    [userId]
  );

  if (!user) throw new AppError('User not found', 404);
  return user;
};

const listPayments = async () => {
  const { rows } = await query(`
    SELECT p.id, p.user_id, p.course_id, p.amount, p.currency, p.description, p.status, p.created_at,
      u.first_name, u.last_name, u.phone,
      c.title as course_title
    FROM payments p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN courses c ON c.id = p.course_id
    ORDER BY p.created_at DESC
  `);
  return rows;
};

const createPayment = async ({ userId, courseId, amount, description, status }) => {
  if (!userId || !courseId || !amount) {
    throw new AppError('userId, courseId, amount majbur', 400);
  }

  const { rows: [user] } = await query('SELECT id FROM users WHERE id=$1', [userId]);
  if (!user) throw new AppError('User not found', 404);

  const { rows: [course] } = await query('SELECT id FROM courses WHERE id=$1', [courseId]);
  if (!course) throw new AppError('Course not found', 404);

  const { rows: [payment] } = await query(
    `INSERT INTO payments (user_id, course_id, amount, currency, description, status)
     VALUES ($1,$2,$3,'UZS',$4,$5)
     RETURNING id, user_id, course_id, amount, currency, description, status, created_at`,
    [userId, courseId, amount, description || null, status || 'paid']
  );

  return payment;
};

const listSalaries = async () => {
  const { rows } = await query(`
    SELECT s.id, s.user_id, s.amount, s.currency, s.description, s.period_month, s.status, s.created_at,
      u.first_name, u.last_name, u.phone, u.role
    FROM salaries s
    LEFT JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
  `);
  return rows;
};

const createSalary = async ({ userId, amount, description, periodMonth, status }) => {
  if (!userId || !amount || !periodMonth) {
    throw new AppError('userId, amount, periodMonth majbur', 400);
  }

  const { rows: [user] } = await query('SELECT id FROM users WHERE id=$1', [userId]);
  if (!user) throw new AppError('User not found', 404);

  const { rows: [salary] } = await query(
    `INSERT INTO salaries (user_id, amount, currency, description, period_month, status)
     VALUES ($1,$2,'UZS',$3,$4,$5)
     RETURNING id, user_id, amount, currency, description, period_month, status, created_at`,
    [userId, amount, description || null, periodMonth, status || 'paid']
  );

  return salary;
};

const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  return '+' + digits;
};

const getTelegramConversations = async () => {
  const { rows } = await query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.telegram_chat_id,
      u.phone,
      u.role,
      (SELECT COUNT(*) FROM telegram_messages WHERE telegram_chat_id=u.telegram_chat_id) as message_count,
      (SELECT MAX(created_at) FROM telegram_messages WHERE telegram_chat_id=u.telegram_chat_id) as last_message_at
    FROM users u
    WHERE u.telegram_chat_id IS NOT NULL
    ORDER BY (SELECT MAX(created_at) FROM telegram_messages WHERE telegram_chat_id=u.telegram_chat_id) DESC NULLS LAST
  `);
  return rows;
};

const getTelegramMessages = async (chatId) => {
  const { rows } = await query(`
    SELECT
      id,
      sender,
      message_text,
      message_type,
      created_at
    FROM telegram_messages
    WHERE telegram_chat_id=$1
    ORDER BY created_at ASC
  `, [chatId]);
  return rows;
};

module.exports = {
  getStats,
  getStudentStats,
  getTeacherStats,
  getTelegramConversations,
  getTelegramMessages,
  listUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserActive,
  listPayments,
  createPayment,
  listSalaries,
  createSalary,
};
