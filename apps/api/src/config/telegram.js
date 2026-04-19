const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

let bot = null;
const userRegistrationState = {}; // Track registration state per user

const generateUsername = (firstName, lastName) => {
  const base = (firstName[0] + lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return (base + random).substring(0, 20);
};

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  return '+' + digits;
};

const escapeMd = (str) => String(str).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');

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
      // Log user message
      await saveMessage(chatId, null, 'user', text, 'text');

      if (text === '/start') {
        delete userRegistrationState[userId];

        const botMessage = '👋 *Yurist Akademiya* botiga xush kelibsiz\\!\n\n' +
          'Quyidagi variantlardan birini tanlang:';

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

      // Registration flow
      const state = userRegistrationState[userId];

      if (state && state.step === 'name') {
        state.firstName = text;
        state.step = 'surname';

        const msg1 = '👨‍👩‍👧 Familiyangizni kiriting:';
        await bot.sendMessage(chatId, msg1);
        await saveMessage(chatId, null, 'bot', msg1, 'text');
        return;
      }

      if (state && state.step === 'surname') {
        state.lastName = text;
        state.step = 'phone1';

        const msg2 = '📱 Asosiy telefon raqamingizni kiriting (+998...):';
        await bot.sendMessage(chatId, msg2);
        await saveMessage(chatId, null, 'bot', msg2, 'text');
        return;
      }

      if (state && state.step === 'phone1') {
        state.phone = normalizePhone(text);
        state.step = 'phone2';

        const msg3 = '📞 Ikkinchi telefon raqamingizni kiriting (Otangiz yoki onangiz telefon raqami):';
        await bot.sendMessage(chatId, msg3);
        await saveMessage(chatId, null, 'bot', msg3, 'text');
        return;
      }

      if (state && state.step === 'phone2') {
        state.secondPhone = normalizePhone(text);
        state.step = 'phone3';

        const msg4 = '📞 Uchinchi telefon raqamingizni kiriting (Otangiz yoki onangiz ikkinchi telefon raqami):';
        await bot.sendMessage(chatId, msg4);
        await saveMessage(chatId, null, 'bot', msg4, 'text');
        return;
      }

      if (state && state.step === 'phone3') {
        state.thirdPhone = normalizePhone(text);

        // Check if ANY phone already exists
        const { rows: existing } = await query(
          'SELECT id FROM users WHERE phone=$1 OR phone=$2 OR phone=$3 OR second_phone=$1 OR second_phone=$2 OR second_phone=$3 OR third_phone=$1 OR third_phone=$2 OR third_phone=$3',
          [state.phone, state.secondPhone, state.thirdPhone]
        );

        if (existing.length > 0) {
          // Restart from name
          delete userRegistrationState[userId];
          userRegistrationState[userId] = { step: 'name' };

          const errMsg = '❌ Bu telefon raqam allaqachon ro\'yxatdan o\'tgan.\n\n📝 Qaytadan ismingizni kiriting:';
          await bot.sendMessage(chatId, errMsg);
          await saveMessage(chatId, null, 'bot', errMsg, 'text');
          return;
        }

        // Generate credentials and create account
        const username = generateUsername(state.firstName, state.lastName);
        const password = generatePassword();
        const passwordHash = bcrypt.hashSync(password, 10);

        // Create user
        const { rows: [newUser] } = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone, second_phone, third_phone, role, telegram_chat_id, is_verified, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'student',$8,true,true)
           RETURNING id, first_name, last_name`,
          [
            `${username}@ya.uz`,
            passwordHash,
            state.firstName,
            state.lastName,
            state.phone,
            state.secondPhone,
            state.thirdPhone,
            chatId.toString()
          ]
        );

        delete userRegistrationState[userId];

        // Send registration data summary
        const dataMsg =
          `✅ *Tabriklaymiz ${escapeMd(state.firstName)}\\!*\n\n` +
          `Ro'yxatdan o'tish muvaffaqiyatli yakunlandi\\.\n\n` +
          `*Sizning ma'lumotlariniz:*\n` +
          `👤 Ism: ${escapeMd(state.firstName)}\n` +
          `👥 Familiya: ${escapeMd(state.lastName)}\n` +
          `📱 Telefon raqami: ${escapeMd(state.phone)}\n` +
          `📞 2\\-telefon: ${escapeMd(state.secondPhone)}\n` +
          `📞 3\\-telefon: ${escapeMd(state.thirdPhone)}\n\n` +
          `*Sizning login ma'lumotlari:*\n` +
          `👤 Foydalanuvchi nomi: \`${username}\`\n` +
          `🔐 Parol: \`${password}\``;

        await bot.sendMessage(chatId, dataMsg, { parse_mode: 'MarkdownV2' });
        await saveMessage(chatId, newUser.id, 'bot', dataMsg, 'info');

        // Send login link
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const loginUrl = `${webUrl}/login?username=${username}&password=${password}`;

        const loginMsg = '🌐 Saytga kirishni boshlang:';
        await bot.sendMessage(chatId, loginMsg, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Saytga kirish', url: loginUrl }]
            ]
          }
        });

        await saveMessage(chatId, newUser.id, 'bot', loginMsg + ' ' + loginUrl, 'button');
        return;
      }

    } catch (e) {
      console.error('Telegram bot message error:', e.message);
      const errMsg = '❌ Xatolik yuz berdi. Qaytadan /start ni bosing.';
      await bot.sendMessage(chatId, errMsg);
      await saveMessage(chatId, null, 'bot', errMsg, 'text');
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
      if (data === 'register') {
        userRegistrationState[userId] = { step: 'name' };

        const regMsg = '📝 *Ro\'yxatdan o\'tish*\n\nIsmingizni kiriting:';
        await bot.sendMessage(chatId, regMsg, { parse_mode: 'MarkdownV2' });
        await saveMessage(chatId, null, 'bot', regMsg, 'info');
      } else if (data === 'login_help') {
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const loginMsg = '🔐 Login sahifasiga o\'tish:';

        await bot.sendMessage(chatId, loginMsg, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Login saytiga kirish', url: `${webUrl}/login` }]
            ]
          },
          parse_mode: 'MarkdownV2'
        });

        await saveMessage(chatId, null, 'bot', loginMsg, 'button');
      }
      await bot.answerCallbackQuery(query.id);
    } catch (e) {
      console.error('Telegram bot callback error:', e.message);
    }
  });

  bot.on('polling_error', (err) => console.error('Telegram polling error:', err.message));

  console.log('✅ Telegram bot started (registration mode)');
};

module.exports = { initTelegramBot };
