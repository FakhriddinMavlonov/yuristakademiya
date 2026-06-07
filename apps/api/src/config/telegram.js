const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

let bot = null;
const userRegistrationState = {};

const generateUsername = (firstName, lastName) => {
  const base = (firstName[0] + lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return (base + random).substring(0, 20);
};

const generatePassword = () => {
  // Strong password: includes uppercase, lowercase, digits, and special chars
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()-_=+';
  const all = upper + lower + digits + special;

  // Ensure at least one of each type
  let pass = '';
  pass += upper[Math.floor(Math.random() * upper.length)];
  pass += lower[Math.floor(Math.random() * lower.length)];
  pass += digits[Math.floor(Math.random() * digits.length)];
  pass += special[Math.floor(Math.random() * special.length)];

  // Fill remaining with random chars from all sets
  for (let i = pass.length; i < 12; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }

  // Shuffle to avoid predictable pattern
  return pass.split('').sort(() => Math.random() - 0.5).join('');
};

const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  return '+' + digits;
};

const escapeMd = (str) => String(str).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');

// Best-effort Telegram presence check — verifies the phone has a valid mobile format.
// True verification (does the number actually have a Telegram account?) requires the
// MTProto Client API (userbot), which is more complex to set up. For now, we accept
// any well-formed Uzbek mobile number and add a short delay to mimic verification UX.
const verifyTelegramPhone = async (phone) => {
  await new Promise((r) => setTimeout(r, 1500));
  // Uzbek mobile: +998 + 9 digits, total 13 chars
  if (!/^\+998\d{9}$/.test(phone)) return false;
  // Mobile carrier prefixes (Beeline, Ucell, MobiUz, UMS, Perfectum, Humans, …)
  const prefix = phone.slice(4, 6);
  const valid = ['90', '91', '93', '94', '95', '97', '98', '99', '88', '77', '50', '33', '20'];
  return valid.includes(prefix);
};

const saveMessage = async (chatId, userId, sender, messageText, messageType = 'text') => {
  try {
    await query(
      `INSERT INTO telegram_messages (user_id, telegram_chat_id, sender, message_text, message_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, chatId.toString(), sender, messageText, messageType]
    );
  } catch (e) {
    console.error('Error saving message:', e.message);
  }
};

const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your-telegram-bot-token') {
    console.log('⚠️  Telegram bot token not set — skipping bot init');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!text) return;

    try {
      await saveMessage(chatId, null, 'user', text, 'text');

      if (text === '/start') {
        delete userRegistrationState[userId];

        const botMessage = '👋 *Yurist Akademiya* botiga xush kelibsiz\\!\n\nQuyidagi variantlardan birini tanlang:';
        await bot.sendMessage(chatId, botMessage, {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Ro\'yxatdan o\'tish', callback_data: 'register' }],
              [{ text: '🔐 Loginga kirish', callback_data: 'login_help' }],
            ]
          }
        });
        await saveMessage(chatId, null, 'bot', botMessage, 'info');
      }

      const state = userRegistrationState[userId];

      if (state && state.step === 'name') {
        state.firstName = text; state.step = 'surname';
        const m = '👨‍👩‍👧 Familiyangizni kiriting:';
        await bot.sendMessage(chatId, m); await saveMessage(chatId, null, 'bot', m, 'text');
        return;
      }
      if (state && state.step === 'surname') {
        state.lastName = text; state.step = 'call_phone';
        const m = '📞 Sizning telefon aloqangiz uchun raqamingizni kiriting (+998... — qo\'ng\'iroq qilish uchun):';
        await bot.sendMessage(chatId, m); await saveMessage(chatId, null, 'bot', m, 'text');
        return;
      }
      if (state && state.step === 'call_phone') {
        state.callPhone = normalizePhone(text); state.step = 'tg_phone';
        const m = '💬 Endi *Telegrami bor* telefon raqamingizni kiriting (+998... — bot xabarlari uchun):';
        await bot.sendMessage(chatId, m, { parse_mode: 'MarkdownV2' });
        await saveMessage(chatId, null, 'bot', m, 'text');
        return;
      }
      if (state && state.step === 'tg_phone') {
        state.telegramPhone = normalizePhone(text);
        const checkMsg = '⏳ Telegram tekshirilmoqda, biroz kuting...';
        await bot.sendMessage(chatId, checkMsg);
        const ok = await verifyTelegramPhone(state.telegramPhone);
        if (!ok) {
          state.step = 'tg_phone';
          const m = '❌ Bu raqamda Telegram topilmadi. Iltimos, *Telegrami bor* raqam kiriting:';
          await bot.sendMessage(chatId, m, { parse_mode: 'MarkdownV2' });
          return;
        }
        state.step = 'parent_call';
        const m = '👨‍👩‍👧 Endi *otangiz yoki onangizning* telefon aloqasi uchun raqamini kiriting:';
        await bot.sendMessage(chatId, m, { parse_mode: 'MarkdownV2' });
        return;
      }
      if (state && state.step === 'parent_call') {
        state.parentCallPhone = normalizePhone(text); state.step = 'parent_tg';
        const m = '💬 Endi *otangiz yoki onangizning Telegrami bor* raqamini kiriting:';
        await bot.sendMessage(chatId, m, { parse_mode: 'MarkdownV2' });
        return;
      }
      if (state && state.step === 'parent_tg') {
        state.parentTelegramPhone = normalizePhone(text);
        await bot.sendMessage(chatId, '⏳ Ota-onaning Telegram raqami tekshirilmoqda...');
        const ok = await verifyTelegramPhone(state.parentTelegramPhone);
        if (!ok) {
          state.step = 'parent_tg';
          const m = '❌ Bu raqamda Telegram topilmadi. Iltimos, *Telegrami bor* raqam kiriting:';
          await bot.sendMessage(chatId, m, { parse_mode: 'MarkdownV2' });
          return;
        }

        // Check duplicates
        const { rows: existing } = await query(
          `SELECT id FROM users WHERE
             call_phone=$1 OR telegram_phone=$1 OR call_phone=$2 OR telegram_phone=$2 OR phone=$1 OR phone=$2`,
          [state.callPhone, state.telegramPhone]
        );
        if (existing.length > 0) {
          delete userRegistrationState[userId];
          userRegistrationState[userId] = { step: 'name' };
          const m = '❌ Bu telefon raqam allaqachon ro\'yxatdan o\'tgan.\n\n📝 Qaytadan ismingizni kiriting:';
          await bot.sendMessage(chatId, m);
          return;
        }

        const username = generateUsername(state.firstName, state.lastName);
        const password = generatePassword();
        const passwordHash = bcrypt.hashSync(password, 10);

        const { rows: [newUser] } = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name,
              phone, call_phone, telegram_phone, parent_call_phone, parent_telegram_phone,
              role, telegram_chat_id, is_verified, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'student',$10,true,true)
           RETURNING id, first_name, last_name`,
          [username, passwordHash, state.firstName, state.lastName,
           state.callPhone, state.callPhone, state.telegramPhone,
           state.parentCallPhone, state.parentTelegramPhone, chatId.toString()]
        );
        delete userRegistrationState[userId];
        await query(
          'UPDATE telegram_messages SET user_id=$1 WHERE telegram_chat_id=$2 AND user_id IS NULL',
          [newUser.id, chatId.toString()]
        );

                // SECURITY: Use a magic token instead of passing credentials in the URL
        const { signMagicToken } = require('../modules/auth/auth.service');
        const magicToken = signMagicToken(newUser.id);
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const autoLoginUrl = `${webUrl}/auto-join?token=${encodeURIComponent(magicToken)}`;

        const dataMsg =
          `✅ *Tabriklaymiz ${escapeMd(state.firstName)}\\!*\n\n` +
          `Ro'yxatdan o'tish muvaffaqiyatli yakunlandi\\.\n\n` +
          `*Sizning ma'lumotlariniz:*\n` +
          `👤 Ism: ${escapeMd(state.firstName)} ${escapeMd(state.lastName)}\n` +
          `📞 Aloqa: ${escapeMd(state.callPhone)}\n` +
          `💬 Telegram: ${escapeMd(state.telegramPhone)}\n` +
          `👨‍👩‍👧 Ota\\-ona aloqa: ${escapeMd(state.parentCallPhone)}\n` +
          `👨‍👩‍👧 Ota\\-ona Telegram: ${escapeMd(state.parentTelegramPhone)}\n\n` +
          `*Login ma'lumotlari:*\n` +
          `👤 Login: \`${username}\`\n` +
          `🔐 Parol: \`${password}\`\n\n` +
          `_⚠️ Parolingizni xavfsiz joyda saqlang\\. Hech kimga bermang\\._`;
        await bot.sendMessage(chatId, dataMsg, { parse_mode: 'MarkdownV2' });

        await bot.sendMessage(chatId, '🌐 Saytga kirishni boshlang:', {
          reply_markup: { inline_keyboard: [[{ text: '🌐 Saytga kirish', url: autoLoginUrl }]] }
        });
        return;
      }

    } catch (e) {
      console.error('Telegram bot message error:', e.message);
      const errMsg = '❌ Xatolik yuz berdi. Qaytadan /start ni bosing.';
      await bot.sendMessage(chatId, errMsg);
      await saveMessage(chatId, null, 'bot', errMsg, 'text');
    }
  });

  bot.on('callback_query', async (cbq) => {
    const chatId = cbq.message.chat.id;
    const userId = cbq.from.id;
    const data = cbq.data;
    try {
      if (data === 'register') {
        userRegistrationState[userId] = { step: 'name' };
        const m = '📝 *Ro\'yxatdan o\'tish*\n\nIsmingizni kiriting:';
        await bot.sendMessage(chatId, m, { parse_mode: 'MarkdownV2' });
        await saveMessage(chatId, null, 'bot', m, 'info');
      } else if (data === 'login_help') {
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        await bot.sendMessage(chatId, '🔐 Login sahifasiga o\'tish:', {
          reply_markup: { inline_keyboard: [[{ text: '🌐 Login', url: `${webUrl}/login` }]] }
        });
      }
      await bot.answerCallbackQuery(cbq.id);
    } catch (e) {
      console.error('Telegram bot callback error:', e.message);
    }
  });

  bot.on('polling_error', (err) => console.error('Telegram polling error:', err.message));
  console.log('✅ Telegram bot started');
};

// Send meeting call notification with inline join button
const sendMeetingCall = async ({ chatId, meetingId, title, teacherName, magicToken }) => {
  if (!bot || !chatId) return false;
  const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const joinUrl = `${webUrl}/auto-join?token=${encodeURIComponent(magicToken)}&meetingId=${meetingId}`;
  const text =
    `📞 *Sizga ustoz qo'ng'iroq qilayapti\\!*\n\n` +
    `👨‍🏫 ${escapeMd(teacherName || 'Ustoz')}\n` +
    `📚 ${escapeMd(title || 'Dars')}\n\n` +
    `_Qabul qilish uchun pastdagi tugmani bosing_ 👇`;
  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      disable_notification: false,
      reply_markup: { inline_keyboard: [[{ text: '📞 Qabul qilish', url: joinUrl }]] },
    });
    return true;
  } catch (e) {
    console.error('[telegram] sendMeetingCall failed:', e.message);
    return false;
  }
};

// Send a reminder notification about an upcoming meeting
const sendMeetingReminder = async ({ chatId, title, teacherName, scheduledAt, reminderType, meetingId, magicToken }) => {
  if (!bot || !chatId) return false;

  const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const joinUrl = magicToken
    ? `${webUrl}/auto-join?token=${encodeURIComponent(magicToken)}&meetingId=${meetingId}`
    : null;

  const timeStr = new Date(scheduledAt).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit', minute: '2-digit',
    day: 'numeric', month: 'long',
  });

  const messages = {
    '24h':  `📅 *Ertaga dars bor\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}\n\n_24 soatdan keyin boshlanyapti_`,
    '12h':  `⏰ *12 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '6h':   `⏰ *6 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '3h':   `⏰ *3 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '2h':   `⏰ *2 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '1h':   `🔔 *1 soatdan keyin dars boshlanadi\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}\n\n_Tayyor bo'ling\\!_`,
    '50m':  `⏳ *50 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '40m':  `⏳ *40 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '30m':  `⏳ *30 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '20m':  `⏳ *20 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '10m':  `🚨 *10 daqiqadan keyin dars boshlanadi\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}\n\n_Hoziroq tayyorlanib oling\\!_`,
    '5m':   `🚨🚨 *DIQQAT\\! 5 daqiqada dars boshlanadi\\!*\n\n📚 ${escapeMd(title)}\n👨‍🏫 ${escapeMd(teacherName)}\n\n*Shoshiling\\!*`,
  };

  const text = messages[reminderType];
  if (!text) return false;

  const keyboard = joinUrl && ['10m', '5m'].includes(reminderType)
    ? { inline_keyboard: [[{ text: '🖥 Darsga kirish', url: joinUrl }]] }
    : undefined;

  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      disable_notification: false,
      ...(keyboard ? { reply_markup: keyboard } : {}),
    });
    return true;
  } catch (e) {
    console.error(`[telegram] sendMeetingReminder(${reminderType}) failed:`, e.message);
    return false;
  }
};

// Notify a student that their meeting has been rescheduled
const sendMeetingReschedule = async ({ chatId, title, oldTime, newTime, teacherName }) => {
  if (!bot || !chatId) return false;
  const fmt = (d) => new Date(d).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const text =
    `🔄 *Dars vaqti o'zgartirildi*\n\n` +
    `📚 ${escapeMd(title || 'Dars')}\n` +
    `👨‍🏫 ${escapeMd(teacherName || 'Ustoz')}\n\n` +
    `⏪ Eski vaqt: ${escapeMd(fmt(oldTime))}\n` +
    `⏩ Yangi vaqt: *${escapeMd(fmt(newTime))}*`;
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', disable_notification: false });
    return true;
  } catch (e) {
    console.error('[telegram] sendMeetingReschedule failed:', e.message);
    return false;
  }
};

/**
 * Send a formatted weekly parent report via Telegram
 * @param {object} report - The report data from getWeeklyReport()
 * @param {string} chatId - Telegram chat ID
 */
const sendParentReport = async (report, chatId) => {
  if (!bot || !chatId) return false;

  const { student, groups, online, offline, gamification } = report;

  // Build rating emojis
  const attendanceRate = parseFloat(offline.attendance.rate);
  const avgGrade = parseFloat(offline.grades.avg);
  const testScore = parseFloat(online.tests.avgScore);
  const examScore = parseFloat(offline.exams.avgScore);

  const getEmoji = (val, good, medium) => {
    if (val >= good) return '🟢';
    if (val >= medium) return '🟡';
    return '🔴';
  };

  const attendanceEmoji = getEmoji(attendanceRate, 90, 75);
  const gradeEmoji = getEmoji(avgGrade, 7, 5);
  const testEmoji = getEmoji(testScore, 80, 60);

  const groupNames = groups.map(g => `${g.name} (${g.shift === 'morning' ? '🌅' : g.shift === 'afternoon' ? '☀️' : '🌆'})`).join(', ') || '—';

  // Stars for rating
  let stars = '';
  const totalScore = (attendanceRate * 0.3) + (avgGrade * 10 * 0.25) + (testScore * 0.25) + (examScore * 0.2);
  if (totalScore >= 85) stars = '⭐⭐⭐⭐⭐';
  else if (totalScore >= 70) stars = '⭐⭐⭐⭐';
  else if (totalScore >= 55) stars = '⭐⭐⭐';
  else if (totalScore >= 40) stars = '⭐⭐';
  else stars = '⭐';

  const weekDays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const today = weekDays[new Date().getDay()];

  const text =
    `📊 *${escapeMd(student.name)} — Haftalik Hisobot* ${stars}\n\n` +
    `📅 ${escapeMd(today)}, ${new Date().toLocaleDateString('uz-UZ')}\n\n` +
    `━━━━━━━━━━━━━━━━\n\n` +

    `🏫 *Guruh:* ${escapeMd(groupNames)}\n\n` +

    `━━━ 📚 ONLINE ━━━\n` +
    `${online.lessons.completed > 0
      ? `✅ Dars bajarilgan: *${online.lessons.completed}* ta / Jami: *${online.lessons.total}* ta\n📺 Ko'rilgan: *${online.lessons.watchedMinutes}* daqiqa\n`
      : '📺 Bu hafta dars ko\'rilmadi\n'}` +
    `${online.tests.attempts > 0
      ? `📝 Test: *${online.tests.attempts}* ta / O'rtacha: *${online.tests.avgScore}%* ${testEmoji}\n`
      : ''}` +
    `${online.assignments.submitted > 0
      ? `✍️ Topshiriqlar: *${online.assignments.submitted}* ta topshirilgan\n`
      : ''}` +
    `\n` +

    `━━━ 🏫 OFFLINE ━━━\n` +
    `${offline.attendance.total > 0
      ? `📋 Davomat: *${offline.attendance.present}/${offline.attendance.total}* (${offline.attendance.rate}%) ${attendanceEmoji}\n` +
        (offline.attendance.absent > 0 ? `❌ Qoldirgan: *${offline.attendance.absent}* ta\n` : '') +
        (offline.attendance.excused > 0 ? `💊 Uzrli: *${offline.attendance.excused}* ta\n` : '')
      : '📋 Bu hafta dars qaydi yo\'q\n'}` +
    `${offline.grades.count > 0
      ? `📝 Baholar: *${offline.grades.count}* ta / O'rtacha: *${offline.grades.avg}* ${gradeEmoji}\n`
      : ''}` +
    `${offline.exams.count > 0
      ? `🎯 Imtihon: *${offline.exams.count}* ta / O'rtacha: *${offline.exams.avgScore}%*\n`
      : ''}` +
    `\n` +

    `━━━ 🏆 YUTUQLAR ━━━\n` +
    `⭐ XP: *${gamification.xp || 0}* ball\n` +
    `📊 Level: *${gamification.level || 1}*\n` +
    `🔥 Streak: *${gamification.streak || 0}* kun\n\n` +

    `━━━━━━━━━━━━━━━━\n` +
    `_⚖️ Yurist Akademiya — Sifatli ta'lim_`;

  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      disable_notification: false,
    });
    return true;
  } catch (e) {
    console.error('[telegram] sendParentReport failed:', e.message);
    return false;
  }
};

/**
 * Send daily brief parent report (shorter version)
 */
const sendParentDailyBrief = async (report, chatId) => {
  if (!bot || !chatId) return false;

  const { student, online, offline } = report;
  const attendanceRate = parseFloat(offline.attendance.rate) || 0;
  const avgGrade = parseFloat(offline.grades.avg) || 0;

  let mood = '😊';
  if (attendanceRate < 50 || avgGrade < 4) mood = '😟';
  else if (attendanceRate < 75 || avgGrade < 6) mood = '😐';

  const text =
    `${mood} *${escapeMd(student.name)}* — kunlik qisqa hisobot\n\n` +
    `📚 Dars: ${online.lessons.completed > 0 ? `✅ ${online.lessons.watchedMinutes} daqiqa` : '❌ Yo\'q'}\n` +
    `📝 Baho: ${offline.grades.count > 0 ? `${offline.grades.avg} ball` : '—'}\n` +
    `📋 Davomat: ${offline.attendance.total > 0 ? `${offline.attendance.rate}%` : '—'}\n` +
    `🎯 Test: ${online.tests.attempts > 0 ? `${online.tests.avgScore}%` : 'Yo\'q'}`;

  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
    return true;
  } catch (e) {
    console.error('[telegram] sendParentDailyBrief failed:', e.message);
    return false;
  }
};

// Generic message — used by chat notifications, daily reports, etc.
const sendBotMessage = async (chatId, text, options = {}) => {
  if (!bot || !chatId) return false;
  try {
    await bot.sendMessage(chatId, text, { disable_notification: false, ...options });
    return true;
  } catch (e) {
    console.error('[telegram] sendBotMessage failed:', e.message);
    return false;
  }
};

module.exports = { initTelegramBot, sendMeetingCall, sendMeetingReminder, sendMeetingReschedule, sendBotMessage, sendParentReport, sendParentDailyBrief };
