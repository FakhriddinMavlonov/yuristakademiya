const Groq = require('groq-sdk');
const { AppError } = require('../../middleware/errorHandler');

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

module.exports = { generateQuiz, checkHomework };
