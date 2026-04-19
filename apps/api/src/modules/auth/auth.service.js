const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const ACCESS_SECRET = () => process.env.JWT_SECRET;
const REFRESH_SECRET = () => (process.env.JWT_SECRET || '') + '_refresh';

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, ACCESS_SECRET(), { expiresIn: '7d' });

const signRefreshToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, type: 'refresh' }, REFRESH_SECRET(), { expiresIn: '14d' });

const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  return '+' + digits;
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const register = async ({ firstName, lastName, phone, password }) => {
  if (!phone || !password || !firstName || !lastName) throw new AppError('Barcha maydonlarni to\'ldiring', 400);
  const normalizedPhone = normalizePhone(phone);
  const exists = await query('SELECT id FROM users WHERE phone=$1', [normalizedPhone]);
  if (exists.rows[0]) throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 409);

  const hash = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  await query(
    `INSERT INTO users (first_name, last_name, phone, password_hash, role, otp_code, otp_expires_at, is_verified)
     VALUES ($1,$2,$3,$4,'student',$5,$6,false) RETURNING id`,
    [firstName, lastName, normalizedPhone, hash, otp, otpExpires]
  );

  return { phone: normalizedPhone, otp, message: 'OTP yuborildi. Telegram botga kodni yuboring.' };
};

const verifyStatus = async (phone) => {
  const normalizedPhone = normalizePhone(phone);
  const { rows: [user] } = await query(
    'SELECT id, first_name, last_name, role, phone, email, is_verified FROM users WHERE phone=$1',
    [normalizedPhone]
  );
  if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);
  if (!user.is_verified) return { verified: false };

  const { is_verified, ...userData } = user;
  return {
    verified: true,
    user: userData,
    accessToken: signAccessToken(userData),
    refreshToken: signRefreshToken(userData),
  };
};

const login = async ({ phoneOrEmail, password }) => {
  if (!phoneOrEmail || !password) throw new AppError('Telefon/email va parol kiriting', 400);

  let userRow;
  if (/^\+?\d[\d\s()-]{6,}$/.test(phoneOrEmail)) {
    const normalized = normalizePhone(phoneOrEmail);
    const { rows } = await query(
      'SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE phone=$1',
      [normalized]
    );
    userRow = rows[0];
  }
  if (!userRow) {
    const { rows } = await query(
      'SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email=$1',
      [phoneOrEmail]
    );
    userRow = rows[0];
  }

  if (!userRow) throw new AppError('Foydalanuvchi topilmadi', 401);
  if (!userRow.is_active) throw new AppError('Hisob bloklangan', 401);
  if (!userRow.is_verified) throw new AppError('Hisob tasdiqlanmagan. Telegram bot orqali tasdiqlang.', 401);

  const valid = await bcrypt.compare(password, userRow.password_hash);
  if (!valid) throw new AppError('Parol noto\'g\'ri', 401);

  const { password_hash, is_verified, ...user } = userRow;
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
};

const refresh = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token required', 401);
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_SECRET());
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  if (decoded.type !== 'refresh') throw new AppError('Invalid token type', 401);

  const { rows: [user] } = await query(
    'SELECT id, role FROM users WHERE id=$1 AND is_active=true AND is_verified=true',
    [decoded.id]
  );
  if (!user) throw new AppError('User not found', 401);

  return { accessToken: signAccessToken(user) };
};

const me = async (userId) => {
  const { rows } = await query(
    'SELECT id, email, first_name, last_name, role, phone, avatar_url, created_at FROM users WHERE id=$1',
    [userId]
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  return rows[0];
};

module.exports = { register, login, me, verifyStatus, refresh };
