const Groq = require('groq-sdk');
const { AppError } = require('../../middleware/errorHandler');
const { query } = require('../../config/db');

const getClient = () => {
  if (!process.env.GROQ_API_KEY) throw new AppError('GROQ_API_KEY not configured', 500);
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const DIFF_LABELS = {
  easy:   "oson daraja — asosiy ta'riflar va tushunchalar",
  medium: "o'rta daraja — qo'llash va tahlil",
  hard:   'qiyin daraja — murakkab tahlil, muammoli holatlar, qonun moddalarini taqqoslash',
};

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last  = text.lastIndexOf('}');
  if (first !== -1 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

async function generateQuiz({ topic, count, difficulty }) {
  const groq = getClient();
  const diff = DIFF_LABELS[difficulty] || DIFF_LABELS.medium;
  const pts  = difficulty === 'hard' ? 3 : difficulty === 'easy' ? 1 : 2;

  const chat = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content:
          "Siz yuridik ta'lim uchun test savollari yaratuvchi AI assistantsiz. " +
          "FAQAT sof JSON formatida javob bering — hech qanday qo'shimcha matn, izoh yoki markdown bo'lmasin.",
      },
      {
        role: 'user',
        content:
          `"${topic}" mavzusi bo'yicha ${count} ta test savoli yarat.\n` +
          `Daraja: ${diff}.\n\n` +
          'Qoidalar:\n' +
          '- Har bir savolda 4 ta variant (A B C D)\n' +
          '- Faqat 1 ta to\'g\'ri javob\n' +
          '- O\'zbek tilida, yuridik ta\'lim uchun mos\n' +
          '- Savollar aniq, bir ma\'noli, qonunchilikka mos\n\n' +
          'Format (faqat JSON):\n' +
          '{"questions":[{"questionText":"...","options":["A...","B...","C...","D..."],"correctIndex":0}]}',
      },
    ],
  });

  const raw = chat.choices[0].message.content || '';
  let parsed;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new AppError("AI javobini tahlil qilib bo'lmadi. Qayta urinib ko'ring.", 500);
  }

  if (!Array.isArray(parsed.questions)) {
    throw new AppError("AI noto'g'ri format qaytardi. Qayta urinib ko'ring.", 500);
  }

  return parsed.questions.slice(0, count).map((q) => ({
    questionText: q.questionText || '',
    points: pts,
    options: (q.options || []).slice(0, 4).map((text) => ({ text: String(text) })),
    correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
  }));
}

async function checkHomework({ content, assignmentTitle }) {
  if (!content || content.trim().length < 15) {
    throw new AppError("Uy ishi matni juda qisqa (kamida 15 belgi kerak).", 400);
  }

  const groq = getClient();

  const chat = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content:
          "Siz yuridik ta'lim sohasida mutaxassis bo'lgan AI tekshiruvchisiz. " +
          "O'quvchi uy ishini qisqa va konstruktiv tarzda baholaysiz. " +
          "FAQAT sof JSON formatida javob bering.",
      },
      {
        role: 'user',
        content:
          `Topshiriq: "${assignmentTitle}"\n\n` +
          `O'quvchi javobi:\n${content}\n\n` +
          'Quyidagi JSON formatida baho bering:\n' +
          '{"strengths":["...","..."],"weaknesses":["...","..."],"recommendations":["...","..."],"summary":"1-2 jumlada umumiy xulosa"}',
      },
    ],
  });

  const raw = chat.choices[0].message.content || '';
  let parsed;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new AppError("AI javobini tahlil qilib bo'lmadi. Qayta urinib ko'ring.", 500);
  }

  return {
    strengths:       (parsed.strengths       || []).slice(0, 5),
    weaknesses:      (parsed.weaknesses      || []).slice(0, 5),
    recommendations: (parsed.recommendations || []).slice(0, 5),
    summary:         parsed.summary || '',
  };
}

async function chat({ userId, message, lessonId, groupLessonId }) {
  if (!message || message.trim().length === 0) throw new AppError('Message is required', 400);

  // Load or create conversation
  let convRes = await query(
    'SELECT * FROM ai_conversations WHERE user_id = $1 AND lesson_id IS NOT DISTINCT FROM $2 ORDER BY updated_at DESC LIMIT 1',
    [userId, lessonId || null]
  );

  let conversation;
  let messages = [];
  if (convRes.rows.length === 0) {
    const newConvRes = await query(
      'INSERT INTO ai_conversations (user_id, lesson_id, group_lesson_id, messages) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, lessonId || null, groupLessonId || null, JSON.stringify([])]
    );
    conversation = newConvRes.rows[0];
  } else {
    conversation = convRes.rows[0];
    messages = conversation.messages || [];
  }

  // Build system prompt
  let systemPrompt = "Siz yordamchi AI assistantsiz. O'quvchiga savollariga javob bersiz. Tushuntirish sodda va aniq bo'lsin.";
  if (lessonId) {
    const lessonRes = await query('SELECT title FROM lessons WHERE id = $1', [lessonId]);
    if (lessonRes.rows.length > 0) {
      systemPrompt += ` Dars: "${lessonRes.rows[0].title}". Shu dars kontekstida javob bering.`;
    }
  }

  // Build messages array for Groq
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
    { role: 'user', content: message },
  ];

  const groq = getClient();
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 1024,
    messages: groqMessages,
  });

  const aiReply = response.choices[0].message.content || "Javob berib bo'lmadi.";

  // Append to messages
  messages.push({ role: 'user', content: message });
  messages.push({ role: 'assistant', content: aiReply });

  // Keep only last 20 messages
  if (messages.length > 20) messages = messages.slice(-20);

  // Update conversation
  await query(
    'UPDATE ai_conversations SET messages = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(messages), conversation.id]
  );

  return {
    conversation_id: conversation.id,
    reply: aiReply,
    messages: messages.length,
  };
}

async function getChatHistory(userId, lessonId = null) {
  const res = await query(
    'SELECT id, messages, created_at FROM ai_conversations WHERE user_id = $1 AND lesson_id IS NOT DISTINCT FROM $2 ORDER BY updated_at DESC LIMIT 1',
    [userId, lessonId || null]
  );

  if (res.rows.length === 0) return { conversation_id: null, messages: [] };

  const conversation = res.rows[0];
  return {
    conversation_id: conversation.id,
    messages: conversation.messages || [],
    created_at: conversation.created_at,
  };
}

// Test natijasidagi noto'g'ri javoblarni AI tushuntiradi
async function explainWrongAnswers({ answers }) {
  if (!Array.isArray(answers)) throw new AppError('answers massivi kerak', 400);
  const wrong = answers.filter(a => a.correct === false);
  if (wrong.length === 0) return { explanations: [] };

  const groq = getClient();

  const questionsText = wrong.map((a, i) =>
    `${i + 1}. Savol: ${a.question_text}\n` +
    `   Siz tanladingiz: ${a.selected_option || '—'}\n` +
    `   To'g'ri javob: ${a.correct_option}`
  ).join('\n\n');

  const chat = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content:
          "Siz yuridik ta'lim sohasida AI tushuntiruvchisiz. " +
          "Talabaning noto'g'ri javoblarini qisqacha va aniq tushuntiring. " +
          "O'zbek tilida, yuridik terminlarga aniq izoh bering. " +
          "FAQAT sof JSON formatida javob bering.",
      },
      {
        role: 'user',
        content:
          `Talabaning noto'g'ri javoblari:\n\n${questionsText}\n\n` +
          `Har bir savol uchun to'g'ri javob nima uchun to'g'ri ekanini 1-2 jumlada tushuntiring.\n\n` +
          `Format:\n{"explanations":[{"question":"...","explanation":"..."}]}`,
      },
    ],
  });

  const raw = chat.choices[0].message.content || '';
  let parsed;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new AppError("AI javobini tahlil qilib bo'lmadi. Qayta urinib ko'ring.", 500);
  }

  return { explanations: (parsed.explanations || []).slice(0, wrong.length) };
}

// Bot ichidan chaqiriladigan umumiy AI yordamchi (qisqa javob)
async function quickReply(message) {
  if (!message?.trim()) return "Savol kiriting.";
  const groq = getClient();
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    max_tokens: 512,
    messages: [
      {
        role: 'system',
        content:
          "Siz Yurist Akademiya Telegram botidagi AI yordamchisiz. " +
          "O'quvchining savoliga qisqa, aniq va foydali javob bering. " +
          "Asosan yuridik ta'lim, huquq va o'qish masalalari bo'yicha yordam bering. " +
          "O'zbek tilida javob bering.",
      },
      { role: 'user', content: message },
    ],
  });
  return res.choices[0].message.content || "Javob berib bo'lmadi.";
}

module.exports = { generateQuiz, checkHomework, chat, getChatHistory, explainWrongAnswers, quickReply };
