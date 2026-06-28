const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcryptjs');
const { query } = require('./db');
const { signMagicToken } = require('../modules/auth/auth.service');

let bot = null;
const userRegistrationState = {};

// Kirill → Lotin transliteratsiya
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  ғ:'g',қ:'q',ҳ:'h',ў:'o',
};

const transliterate = (str) =>
  str.toLowerCase().split('').map(c => TRANSLIT[c] ?? (c.match(/[a-z0-9]/) ? c : '')).join('');

const generateUsername = (firstName, lastName) => {
  const base = transliterate((firstName[0] || '') + lastName) || 'user';
  const random = Math.random().toString(36).substring(2, 6);
  return (base + random).substring(0, 20);
};

const generatePassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()-_=+';
  const all = upper + lower + digits + special;
  let pass = '';
  pass += upper[Math.floor(Math.random() * upper.length)];
  pass += lower[Math.floor(Math.random() * lower.length)];
  pass += digits[Math.floor(Math.random() * digits.length)];
  pass += special[Math.floor(Math.random() * special.length)];
  for (let i = pass.length; i < 12; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pass.split('').sort(() => Math.random() - 0.5).join('');
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  return '+' + digits;
};

// Faqat MarkdownV2 yakuniy xabar uchun ishlatiladi
const escapeMd = (str) => String(str).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');

// HTML parse_mode uchun (MarkdownV2 dan ishonchliroq)
const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const isValidUzPhone = (phone) => /^\+998\d{9}$/.test(phone);

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

// Ro'yxatdan o'tish oqimi (5 qadam):
// 1. name → 2. surname → 3. call_phone (matn+validatsiya)
// 4. tg_phone (Contact button — haqiqiy Telegram raqam)
// 5. parent_phone (matn+validatsiya) → yakunlash
//
// Ota-ona oqimi: /start parent_<studentId>
// Bot Contact button orqali ota-onaning chat_id ni saqlaydi

const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your-telegram-bot-token') {
    console.log('⚠️  Telegram bot token not set — skipping bot init');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    const contact = msg.contact;
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!text && !contact) return;

    try {
      if (text) await saveMessage(chatId, null, 'user', text, 'text');

      // /start — har doim oqimni qayta boshlaydi
      if (text && text.startsWith('/start')) {
        delete userRegistrationState[userId];

        // Ota-ona deeplink: /start parent_<studentId>
        const param = text.split(' ')[1];
        if (param && param.startsWith('parent_')) {
          const studentId = parseInt(param.replace('parent_', ''), 10);
          if (!isNaN(studentId)) {
            userRegistrationState[userId] = { step: 'parent_verify', studentId };
            const m =
              "👨‍👩‍👧 Yurist Akademiya — Ota-ona portali\n\n" +
              "Farzandingizning hisobotlarini olish uchun telefon raqamingizni tasdiqlang:";
            await bot.sendMessage(chatId, m, {
              reply_markup: {
                keyboard: [[{ text: '📱 Raqamimni ulashish', request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
            await saveMessage(chatId, null, 'bot', m, 'info');
            return;
          }
        }

        const m = "👋 Yurist Akademiya botiga xush kelibsiz!\n\nQuyidagi variantlardan birini tanlang:";
        await bot.sendMessage(chatId, m, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📝 Ro'yxatdan o'tish", callback_data: 'register' }],
              [{ text: '🔐 Loginga kirish', callback_data: 'login_help' }],
            ],
          },
        });
        await saveMessage(chatId, null, 'bot', m, 'info');
        return;
      }

      // Ota-ona tasdiqlash qadami
      if (userRegistrationState[userId]?.step === 'parent_verify') {
        const state = userRegistrationState[userId];
        if (contact) {
          const parentPhone = normalizePhone(contact.phone_number);
          // Talabaning ota-ona raqami bilan solishtiramiz
          const { rows: [student] } = await query(
            `SELECT id, first_name, last_name, parent_call_phone, parent_telegram_phone
             FROM users WHERE id = $1`,
            [state.studentId]
          );
          if (!student) {
            await bot.sendMessage(chatId, "❌ Talaba topilmadi.", { reply_markup: { remove_keyboard: true } });
            delete userRegistrationState[userId];
            return;
          }
          const phones = [student.parent_call_phone, student.parent_telegram_phone].filter(Boolean);
          if (!phones.includes(parentPhone)) {
            await bot.sendMessage(chatId,
              "❌ Bu raqam farzandingizning ro'yxatdan o'tish ma'lumotlari bilan mos kelmadi.\n" +
              "Iltimos, ro'yxatdan o'tishda kiritilgan raqamni yuboring.",
              { reply_markup: { remove_keyboard: true } }
            );
            delete userRegistrationState[userId];
            return;
          }
          // chat_id ni saqlash
          await query(
            `UPDATE users SET parent_telegram_chat_id = $1 WHERE id = $2`,
            [chatId.toString(), state.studentId]
          );
          delete userRegistrationState[userId];
          const m =
            `✅ Tasdiqlandi!\n\n` +
            `Siz ${student.first_name} ${student.last_name}ning ota/onasi sifatida ro'yxatdan o'tdingiz.\n\n` +
            `Endi siz farzandingizning haftalik va kunlik hisobotlarini shu botdan olasiz.`;
          await bot.sendMessage(chatId, m, { reply_markup: { remove_keyboard: true } });
          await saveMessage(chatId, student.id, 'bot', m, 'info');
          return;
        }
        if (text) {
          const m = "📱 Iltimos, 'Raqamimni ulashish' tugmasini bosing.";
          await bot.sendMessage(chatId, m);
          return;
        }
        return;
      }

      const state = userRegistrationState[userId];
      if (!state) return;

      // Qadam 1: Ism
      if (state.step === 'name') {
        if (!text) return;
        state.firstName = text;
        state.step = 'surname';
        const m = '👤 Familiyangizni kiriting:';
        await bot.sendMessage(chatId, m);
        await saveMessage(chatId, null, 'bot', m, 'text');
        return;
      }

      // Qadam 2: Familiya
      if (state.step === 'surname') {
        if (!text) return;
        state.lastName = text;
        state.step = 'call_phone';
        const m = "📞 Aloqa telefon raqamingizni kiriting:\nMasalan: 901234567 yoki +998901234567";
        await bot.sendMessage(chatId, m);
        await saveMessage(chatId, null, 'bot', m, 'text');
        return;
      }

      // Qadam 3: Aloqa telefon (matn bilan)
      if (state.step === 'call_phone') {
        if (!text) return;
        const normalized = normalizePhone(text);
        if (!isValidUzPhone(normalized)) {
          const m = "❌ Raqam noto'g'ri formatda.\nIltimos, +998XXXXXXXXX yoki 9XXXXXXXX formatida kiriting:";
          await bot.sendMessage(chatId, m);
          return;
        }
        state.callPhone = normalized;
        state.step = 'tg_phone';
        const m = "📱 Endi Telegram raqamingizni tasdiqlang.\nQuyidagi tugmani bosing:";
        await bot.sendMessage(chatId, m, {
          reply_markup: {
            keyboard: [[{ text: '📱 Raqamimni ulashish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        await saveMessage(chatId, null, 'bot', m, 'text');
        return;
      }

      // Qadam 4: Telegram telefon (Contact button orqali)
      if (state.step === 'tg_phone') {
        if (contact) {
          state.telegramPhone = normalizePhone(contact.phone_number);
          state.step = 'parent_phone';
          const m = "👨‍👩‍👧 Ota/onangizning telefon raqamini kiriting:\nMasalan: 901234567 yoki +998901234567";
          await bot.sendMessage(chatId, m, { reply_markup: { remove_keyboard: true } });
          await saveMessage(chatId, null, 'bot', m, 'text');
          return;
        }
        // Foydalanuvchi tugma o'rniga matn kiritdi
        const m = "📱 Iltimos, yuqoridagi 'Raqamimni ulashish' tugmasini bosing.";
        await bot.sendMessage(chatId, m);
        return;
      }

      // Qadam 5: Ota-ona telefon
      if (state.step === 'parent_phone') {
        if (!text) return;
        const normalized = normalizePhone(text);
        if (!isValidUzPhone(normalized)) {
          const m = "❌ Raqam noto'g'ri formatda.\nIltimos, +998XXXXXXXXX yoki 9XXXXXXXX formatida kiriting:";
          await bot.sendMessage(chatId, m);
          return;
        }
        state.parentPhone = normalized;

        // Takroriy ro'yxatdan o'tganlik tekshiruvi
        const { rows: existing } = await query(
          `SELECT id FROM users WHERE
             call_phone=$1 OR telegram_phone=$1 OR call_phone=$2 OR telegram_phone=$2 OR phone=$1 OR phone=$2`,
          [state.callPhone, state.telegramPhone]
        );
        if (existing.length > 0) {
          delete userRegistrationState[userId];
          userRegistrationState[userId] = { step: 'name' };
          const m = "❌ Bu telefon raqam allaqachon ro'yxatdan o'tgan.\n\n📝 Boshqatdan ismingizni kiriting:";
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
          [
            username, passwordHash, state.firstName, state.lastName,
            state.callPhone, state.callPhone, state.telegramPhone,
            state.parentPhone, state.parentPhone,
            chatId.toString(),
          ]
        );

        // INSERT muvaffaqiyatli — state shu yerda o'chiriladi
        delete userRegistrationState[userId];

        await query(
          'UPDATE telegram_messages SET user_id=$1 WHERE telegram_chat_id=$2 AND user_id IS NULL',
          [newUser.id, chatId.toString()]
        );

        const magicToken = signMagicToken(newUser.id);
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const autoLoginUrl = `${webUrl}/auto-join?token=${encodeURIComponent(magicToken)}`;

        // HTML parse_mode — MarkdownV2 dan ishonchliroq, maxsus belgilar muammo qilmaydi
        const dataMsg =
          `✅ <b>Tabriklaymiz ${escapeHtml(state.firstName)}!</b>\n\n` +
          `Ro'yxatdan o'tish muvaffaqiyatli yakunlandi.\n\n` +
          `<b>Sizning ma'lumotlaringiz:</b>\n` +
          `👤 Ism: ${escapeHtml(state.firstName)} ${escapeHtml(state.lastName)}\n` +
          `📞 Aloqa: ${escapeHtml(state.callPhone)}\n` +
          `💬 Telegram: ${escapeHtml(state.telegramPhone)}\n` +
          `👨‍👩‍👧 Ota-ona: ${escapeHtml(state.parentPhone)}\n\n` +
          `<b>Login ma'lumotlari:</b>\n` +
          `👤 Login: <code>${escapeHtml(username)}</code>\n` +
          `🔐 Parol: <code>${escapeHtml(password)}</code>\n\n` +
          `<i>Parolingizni xavfsiz joyda saqlang. Hech kimga bermang.</i>`;

        // Xabar yuborish xatoligi INSERT muvaffaqiyatini bekor qilmasligi kerak
        try {
          await bot.sendMessage(chatId, dataMsg, { parse_mode: 'HTML' });
          await bot.sendMessage(chatId, '🌐 Saytga kirishni boshlang:', {
            reply_markup: { inline_keyboard: [[{ text: '🌐 Saytga kirish', url: autoLoginUrl }]] },
          });

          // Ota-ona deeplink
          const botUsername = process.env.VITE_TELEGRAM_BOT_USERNAME || 'yuristakademiyabot';
          const parentDeeplink = `https://t.me/${botUsername}?start=parent_${newUser.id}`;
          await bot.sendMessage(chatId,
            "👨‍👩‍👧 Ota/onangiz hisobotlarni olishi uchun quyidagi havolani ulashing:",
            {
              reply_markup: {
                inline_keyboard: [[{ text: "📤 Ota-onaga ulashish", url: parentDeeplink }]],
              },
            }
          );
        } catch (msgErr) {
          console.error('[telegram] Credentials message failed after successful INSERT:', msgErr.message);
          // Oddiy matn bilan zaxira xabar — foydalanuvchi ma'lumotlarini olishi shart
          try {
            await bot.sendMessage(chatId,
              `✅ Ro'yxatdan o'tdingiz!\n\nLogin: ${username}\nParol: ${password}\n\nSaytga kiring: ${autoLoginUrl}`
            );
          } catch (fallbackErr) {
            console.error('[telegram] Fallback message also failed:', fallbackErr.message);
          }
        }
        return;
      }

      // Registratsiya oqimi yo'q — AI yordamchiga yuborish
      if (text && !state) {
        try {
          const { quickReply } = require('../modules/ai/ai.service');
          const reply = await quickReply(text);
          await bot.sendMessage(chatId, reply);
          await saveMessage(chatId, null, 'bot', reply, 'text');
        } catch {
          await bot.sendMessage(chatId, "Hozircha savolga javob bera olmadim. Qayta urinib ko'ring.");
        }
        return;
      }

    } catch (e) {
      console.error('[telegram] Handler error:', e.message, '\nStack:', e.stack);
      // State albatta tozalanadi — foydalanuvchi stuck qolmasin
      delete userRegistrationState[userId];
      try {
        const errMsg = "❌ Xatolik yuz berdi. Qaytadan /start ni bosing.";
        await bot.sendMessage(chatId, errMsg, { reply_markup: { remove_keyboard: true } });
        await saveMessage(chatId, null, 'bot', errMsg, 'text');
      } catch { /* xabar yuborib bo'lmadi, log yuqorida bor */ }
    }
  });

  bot.on('callback_query', async (cbq) => {
    const chatId = cbq.message.chat.id;
    const userId = cbq.from.id;
    const data = cbq.data;
    try {
      if (data === 'register') {
        userRegistrationState[userId] = { step: 'name' };
        const m = "📝 Royxatdan otish\n\nIsmingizni kiriting:";
        await bot.sendMessage(chatId, m);
        await saveMessage(chatId, null, 'bot', m, 'info');
      } else if (data === 'login_help') {
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        await bot.sendMessage(chatId, "🔐 Login sahifasiga otish:", {
          reply_markup: { inline_keyboard: [[{ text: '🌐 Login', url: `${webUrl}/login` }]] },
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

// ─── Xabarnomalar ─────────────────────────────────────────────────────────────

const sendMeetingCall = async ({ chatId, meetingId, title, teacherName, magicToken }) => {
  if (!bot || !chatId) return false;
  const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const joinUrl = `${webUrl}/auto-join?token=${encodeURIComponent(magicToken)}&meetingId=${meetingId}`;
  const text =
    `📞 *Sizga ustoz qongiroq qilayapti\\!*\n\n` +
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
    '24h': `📅 *Ertaga dars bor\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}\n\n_24 soatdan keyin boshlanyapti_`,
    '12h': `⏰ *12 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '6h':  `⏰ *6 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '3h':  `⏰ *3 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '2h':  `⏰ *2 soatdan keyin dars\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '1h':  `🔔 *1 soatdan keyin dars boshlanadi\\!*\n\n👨‍🏫 ${escapeMd(teacherName)}\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}\n\n_Tayyor boing\\!_`,
    '50m': `⏳ *50 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '40m': `⏳ *40 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '30m': `⏳ *30 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '20m': `⏳ *20 daqiqadan keyin dars\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}`,
    '10m': `🚨 *10 daqiqadan keyin dars boshlanadi\\!*\n\n📚 ${escapeMd(title)}\n🕐 ${escapeMd(timeStr)}\n\n_Hoziroq tayyorlanib oling\\!_`,
    '5m':  `🚨🚨 *DIQQAT\\! 5 daqiqada dars boshlanadi\\!*\n\n📚 ${escapeMd(title)}\n👨‍🏫 ${escapeMd(teacherName)}\n\n*Shoshiling\\!*`,
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

const sendMeetingReschedule = async ({ chatId, title, oldTime, newTime, teacherName }) => {
  if (!bot || !chatId) return false;
  const fmt = (d) => new Date(d).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
  const text =
    `🔄 *Dars vaqti ozgartirildi*\n\n` +
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

const sendParentReport = async (report, chatId) => {
  if (!bot || !chatId) return false;

  const { student, groups, online, offline, gamification } = report;

  const attendanceRate = parseFloat(offline.attendance.rate);
  const avgGrade = parseFloat(offline.grades.avg);
  const testScore = parseFloat(online.tests.avgScore);
  const examScore = parseFloat(offline.exams.avgScore);

  const getEmoji = (val, good, medium) => val >= good ? '🟢' : val >= medium ? '🟡' : '🔴';

  const attendanceEmoji = getEmoji(attendanceRate, 90, 75);
  const gradeEmoji = getEmoji(avgGrade, 7, 5);
  const testEmoji = getEmoji(testScore, 80, 60);

  const groupNames = groups.map(g =>
    `${g.name} (${g.shift === 'morning' ? '🌅' : g.shift === 'afternoon' ? '☀️' : '🌆'})`
  ).join(', ') || '—';

  const totalScore = (attendanceRate * 0.3) + (avgGrade * 10 * 0.25) + (testScore * 0.25) + (examScore * 0.2);
  const stars =
    totalScore >= 85 ? '⭐⭐⭐⭐⭐' :
    totalScore >= 70 ? '⭐⭐⭐⭐' :
    totalScore >= 55 ? '⭐⭐⭐' :
    totalScore >= 40 ? '⭐⭐' : '⭐';

  const weekDays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const today = weekDays[new Date().getDay()];

  const text =
    `📊 *${escapeMd(student.name)} — Haftalik Hisobot* ${stars}\n\n` +
    `📅 ${escapeMd(today)}, ${new Date().toLocaleDateString('uz-UZ')}\n\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `🏫 *Guruh:* ${escapeMd(groupNames)}\n\n` +
    `━━━ 📚 ONLINE ━━━\n` +
    `${online.lessons.completed > 0
      ? `✅ Dars bajarilgan: *${online.lessons.completed}* ta / Jami: *${online.lessons.total}* ta\n📺 Korilgan: *${online.lessons.watchedMinutes}* daqiqa\n`
      : '📺 Bu hafta dars korilmadi\n'}` +
    `${online.tests.attempts > 0 ? `📝 Test: *${online.tests.attempts}* ta / Ortacha: *${online.tests.avgScore}%* ${testEmoji}\n` : ''}` +
    `${online.assignments.submitted > 0 ? `✍️ Topshiriqlar: *${online.assignments.submitted}* ta topshirilgan\n` : ''}` +
    `\n` +
    `━━━ 🏫 OFFLINE ━━━\n` +
    `${offline.attendance.total > 0
      ? `📋 Davomat: *${offline.attendance.present}/${offline.attendance.total}* (${offline.attendance.rate}%) ${attendanceEmoji}\n` +
        (offline.attendance.absent > 0 ? `❌ Qoldirgan: *${offline.attendance.absent}* ta\n` : '') +
        (offline.attendance.excused > 0 ? `💊 Uzrli: *${offline.attendance.excused}* ta\n` : '')
      : '📋 Bu hafta dars qaydi yoq\n'}` +
    `${offline.grades.count > 0 ? `📝 Baholar: *${offline.grades.count}* ta / Ortacha: *${offline.grades.avg}* ${gradeEmoji}\n` : ''}` +
    `${offline.exams.count > 0 ? `🎯 Imtihon: *${offline.exams.count}* ta / Ortacha: *${offline.exams.avgScore}%*\n` : ''}` +
    `\n` +
    `━━━ 🏆 YUTUQLAR ━━━\n` +
    `⭐ XP: *${gamification.xp || 0}* ball\n` +
    `📊 Level: *${gamification.level || 1}*\n` +
    `🔥 Streak: *${gamification.streak || 0}* kun\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `_⚖️ Yurist Akademiya — Sifatli talim_`;

  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', disable_notification: false });
    return true;
  } catch (e) {
    console.error('[telegram] sendParentReport failed:', e.message);
    return false;
  }
};

const sendParentDailyBrief = async (report, chatId) => {
  if (!bot || !chatId) return false;

  const { student, online, offline } = report;
  const attendanceRate = parseFloat(offline.attendance.rate) || 0;
  const avgGrade = parseFloat(offline.grades.avg) || 0;

  const mood = (attendanceRate < 50 || avgGrade < 4) ? '😟' : (attendanceRate < 75 || avgGrade < 6) ? '😐' : '😊';

  const text =
    `${mood} *${escapeMd(student.name)}* — kunlik qisqa hisobot\n\n` +
    `📚 Dars: ${online.lessons.completed > 0 ? `✅ ${online.lessons.watchedMinutes} daqiqa` : "❌ Yoq"}\n` +
    `📝 Baho: ${offline.grades.count > 0 ? `${offline.grades.avg} ball` : '—'}\n` +
    `📋 Davomat: ${offline.attendance.total > 0 ? `${offline.attendance.rate}%` : '—'}\n` +
    `🎯 Test: ${online.tests.attempts > 0 ? `${online.tests.avgScore}%` : "Yoq"}`;

  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
    return true;
  } catch (e) {
    console.error('[telegram] sendParentDailyBrief failed:', e.message);
    return false;
  }
};

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

module.exports = {
  initTelegramBot,
  sendMeetingCall,
  sendMeetingReminder,
  sendMeetingReschedule,
  sendBotMessage,
  sendParentReport,
  sendParentDailyBrief,
};
