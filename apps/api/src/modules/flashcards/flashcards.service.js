const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const Groq = require('groq-sdk');

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new AppError('GROQ_API_KEY not configured', 500);
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(ease, interval, quality) {
  // quality: 0=again, 1=hard, 2=good, 3=easy
  let new_ef = ease + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02);
  new_ef = Math.max(1.3, new_ef);

  let new_interval;
  if (quality === 0) {
    new_interval = 1;
  } else if (quality === 1) {
    new_interval = interval;
  } else if (quality === 2) {
    new_interval = Math.round(interval * ease);
  } else {
    new_interval = Math.round(interval * ease * 1.3);
  }

  return { ease_factor: new_ef, interval_days: new_interval };
}

async function listDecks(teacherId) {
  const res = await query(
    'SELECT id, lesson_id, group_lesson_id, title, created_at, (SELECT COUNT(*) FROM flashcards WHERE deck_id = flashcard_decks.id) as card_count FROM flashcard_decks WHERE teacher_id = $1 ORDER BY created_at DESC',
    [teacherId]
  );
  return res.rows;
}

async function getDeck(deckId, teacherId = null) {
  const deckRes = await query('SELECT * FROM flashcard_decks WHERE id = $1', [deckId]);
  if (deckRes.rows.length === 0) throw new AppError('Deck not found', 404);

  const deck = deckRes.rows[0];
  if (teacherId && deck.teacher_id !== teacherId) throw new AppError('Unauthorized', 403);

  const cardsRes = await query('SELECT id, front, back, created_at FROM flashcards WHERE deck_id = $1 ORDER BY created_at', [deckId]);
  deck.cards = cardsRes.rows;

  return deck;
}

async function createDeck(teacherId, data) {
  const { title, lesson_id, group_lesson_id } = data;
  if (!title || title.trim().length === 0) throw new AppError('Title is required', 400);

  const res = await query(
    'INSERT INTO flashcard_decks (teacher_id, title, lesson_id, group_lesson_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [teacherId, title, lesson_id || null, group_lesson_id || null]
  );
  return res.rows[0];
}

async function addCard(deckId, teacherId, data) {
  const { front, back } = data;
  if (!front || !back) throw new AppError('Front and back are required', 400);

  const deckRes = await query('SELECT teacher_id FROM flashcard_decks WHERE id = $1', [deckId]);
  if (deckRes.rows.length === 0) throw new AppError('Deck not found', 404);
  if (deckRes.rows[0].teacher_id !== teacherId) throw new AppError('Unauthorized', 403);

  const res = await query(
    'INSERT INTO flashcards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING *',
    [deckId, front, back]
  );
  return res.rows[0];
}

async function removeCard(cardId, teacherId) {
  const cardRes = await query('SELECT fd.teacher_id FROM flashcards fc JOIN flashcard_decks fd ON fc.deck_id = fd.id WHERE fc.id = $1', [cardId]);
  if (cardRes.rows.length === 0) throw new AppError('Card not found', 404);
  if (cardRes.rows[0].teacher_id !== teacherId) throw new AppError('Unauthorized', 403);

  await query('DELETE FROM flashcard_reviews WHERE flashcard_id = $1', [cardId]);
  await query('DELETE FROM flashcards WHERE id = $1', [cardId]);
}

async function removeDeck(deckId, teacherId) {
  const deckRes = await query('SELECT teacher_id FROM flashcard_decks WHERE id = $1', [deckId]);
  if (deckRes.rows.length === 0) throw new AppError('Deck not found', 404);
  if (deckRes.rows[0].teacher_id !== teacherId) throw new AppError('Unauthorized', 403);

  await query('DELETE FROM flashcard_reviews WHERE flashcard_id IN (SELECT id FROM flashcards WHERE deck_id = $1)', [deckId]);
  await query('DELETE FROM flashcards WHERE deck_id = $1', [deckId]);
  await query('DELETE FROM flashcard_decks WHERE id = $1', [deckId]);
}

async function getDueCards(userId) {
  const today = new Date().toISOString().split('T')[0];
  const res = await query(`
    SELECT
      fc.id,
      fc.front,
      fc.back,
      fd.title as deck_title,
      COALESCE(fr.ease_factor, 2.5) as ease_factor,
      COALESCE(fr.interval_days, 1) as interval_days,
      COALESCE(fr.repetition_count, 0) as repetition_count
    FROM flashcards fc
    JOIN flashcard_decks fd ON fc.deck_id = fd.id
    LEFT JOIN flashcard_reviews fr ON fr.flashcard_id = fc.id AND fr.user_id = $1
    WHERE COALESCE(fr.next_review_date, CURRENT_DATE) <= $2
    ORDER BY COALESCE(fr.next_review_date, CURRENT_DATE), fc.id
  `, [userId, today]);

  return res.rows;
}

async function reviewCard(userId, cardId, ease) {
  // ease: 'again'=0, 'hard'=1, 'good'=2, 'easy'=3
  const easeMap = { again: 0, hard: 1, good: 2, easy: 3 };
  const easeValue = easeMap[ease];

  if (easeValue === undefined) throw new AppError('Invalid ease value', 400);

  const cardRes = await query('SELECT id FROM flashcards WHERE id = $1', [cardId]);
  if (cardRes.rows.length === 0) throw new AppError('Card not found', 404);

  const reviewRes = await query(
    'SELECT ease_factor, interval_days, repetition_count FROM flashcard_reviews WHERE user_id = $1 AND flashcard_id = $2',
    [userId, cardId]
  );

  let review_data;
  if (reviewRes.rows.length === 0) {
    review_data = { ease_factor: 2.5, interval_days: 1, repetition_count: 0 };
  } else {
    review_data = reviewRes.rows[0];
  }

  const { ease_factor, interval_days, repetition_count } = review_data;
  const { ease_factor: new_ef, interval_days: new_interval } = calculateNextReview(ease_factor, interval_days, easeValue);

  const next_review_date = new Date();
  next_review_date.setDate(next_review_date.getDate() + new_interval);
  const next_review_date_str = next_review_date.toISOString().split('T')[0];

  await query(`
    INSERT INTO flashcard_reviews (user_id, flashcard_id, ease_factor, interval_days, repetition_count, next_review_date, last_reviewed_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
      ease_factor = $3,
      interval_days = $4,
      repetition_count = $5,
      next_review_date = $6,
      last_reviewed_at = NOW()
  `, [userId, cardId, new_ef, new_interval, repetition_count + 1, next_review_date_str]);

  return { success: true, next_review_date: next_review_date_str };
}

async function generateWithAI(lessonTitle, count = 10) {
  const groq = getGroqClient();

  const prompt = `Siz yuridik ta'lim uchun flashcard (savol-javob kartasi) yaratuvchi AI assistantsiz.
"${lessonTitle}" mavzusi bo'yicha ${count} ta flashcard yarat.
FAQAT sof JSON formatida javob bering — hech qanday qo'shimcha matn yoki izoh bo'lmasin.

Format:
{
  "cards": [
    { "front": "Savol yoki ta'rif...", "back": "Javob..." },
    ...
  ]
}`;

  const chat = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 3000,
    messages: [
      {
        role: 'system',
        content:
          'Siz yuridik ta\'lim sohasida flashcard yaratuvchi mutaxassissiz. Kartalar aniq, qisqa va tushunarli bo\'lishi kerak.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const raw = chat.choices[0].message.content || '{}';
  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    throw new AppError('AI javobini tahlil qilib bo\'lmadi', 500);
  }

  if (!Array.isArray(parsed.cards)) throw new AppError('Invalid AI response format', 500);

  return parsed.cards.slice(0, count).map(c => ({
    front: String(c.front || ''),
    back: String(c.back || ''),
  }));
}

module.exports = {
  listDecks,
  getDeck,
  createDeck,
  addCard,
  removeCard,
  removeDeck,
  getDueCards,
  reviewCard,
  generateWithAI,
};
