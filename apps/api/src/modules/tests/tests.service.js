const { query, transaction } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const getWithQuestions = async (testId, userId, role) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [testId]);
  if (!test) throw new AppError('Test not found', 404);

  const { rows: questions } = await query(`
    SELECT q.id, q.question_text, q.points, q.order_num,
      json_agg(json_build_object('id',o.id,'text',o.option_text,'order_num',o.order_num)
        ORDER BY o.order_num) AS options
    FROM test_questions q
    JOIN test_options o ON o.question_id = q.id
    WHERE q.test_id = $1
    GROUP BY q.id ORDER BY q.order_num
  `, [testId]);

  if (role === 'teacher') {
    const withAnswers = await Promise.all(questions.map(async (q) => {
      const { rows: opts } = await query('SELECT * FROM test_options WHERE question_id=$1', [q.id]);
      return { ...q, options: opts };
    }));
    return { ...test, questions: withAnswers };
  }

  // student — check attempts
  const { rows: attempts } = await query(`
    SELECT * FROM test_attempts WHERE user_id=$1 AND test_id=$2 ORDER BY started_at DESC
  `, [userId, testId]);
  const attemptsUsed = attempts.length;
  const passed = attempts.some(a => a.passed);

  return { ...test, questions, attemptsUsed, passed };
};

const createOrUpdate = async (lessonId, teacherId, data) => {
  return transaction(async (client) => {
    console.log('[tests] createOrUpdate lessonId=%s teacherId=%s questions=%d passages=%d',
      lessonId, teacherId, data.questions?.length, data.passages?.length);

    const { rows: [lesson] } = await client.query(`
      SELECT l.id FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=$1 AND c.teacher_id=$2
    `, [lessonId, teacherId]);
    if (!lesson) throw new AppError('Forbidden', 403);

    let testId = data.id;

    if (!testId) {
      const { rows: [t] } = await client.query(`
        INSERT INTO tests (lesson_id, title, time_limit_minutes, pass_score_pct, max_attempts, shuffle_questions, show_answers_after)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
      `, [lessonId, data.title, data.timeLimitMinutes, data.passScorePct, data.maxAttempts, data.shuffleQuestions, data.showAnswersAfter]);
      testId = t.id;
    } else {
      await client.query(`
        UPDATE tests SET title=$1, time_limit_minutes=$2, pass_score_pct=$3, max_attempts=$4,
          shuffle_questions=$5, show_answers_after=$6, updated_at=NOW() WHERE id=$7
      `, [data.title, data.timeLimitMinutes, data.passScorePct, data.maxAttempts, data.shuffleQuestions, data.showAnswersAfter, testId]);
      await client.query('DELETE FROM test_questions WHERE test_id=$1', [testId]);
    }

    if (data.passages !== undefined) {
      console.log('[tests] updating passages for testId=%s', testId);
      await client.query('UPDATE tests SET passages=$1 WHERE id=$2', [JSON.stringify(data.passages || []), testId]);
    }

    console.log('[tests] inserting %d questions', data.questions.length);
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      if (!q || !Array.isArray(q.options)) {
        throw new AppError(`Question ${i} has invalid structure: ${JSON.stringify(q)}`, 400);
      }
      const { rows: [qr] } = await client.query(`
        INSERT INTO test_questions (test_id, question_text, points, order_num) VALUES ($1,$2,$3,$4) RETURNING id
      `, [testId, q.questionText, q.points || 2, i + 1]);
      for (let j = 0; j < q.options.length; j++) {
        const optText = q.options[j]?.text ?? '';
        await client.query(`
          INSERT INTO test_options (question_id, option_text, is_correct, order_num) VALUES ($1,$2,$3,$4)
        `, [qr.id, optText, j === q.correctIndex, j + 1]);
      }
    }

    return { id: testId };
  });
};

const startAttempt = async (userId, testId) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [testId]);
  if (!test) throw new AppError('Test not found', 404);

  const { rows: attempts } = await query(`
    SELECT * FROM test_attempts WHERE user_id=$1 AND test_id=$2
  `, [userId, testId]);

  const passed = attempts.some(a => a.passed);
  if (passed) throw new AppError('Test already passed', 400);
  if (test.max_attempts && attempts.length >= test.max_attempts) {
    throw new AppError('Max attempts reached', 400);
  }

  const { rows: [attempt] } = await query(`
    INSERT INTO test_attempts (user_id, test_id) VALUES ($1,$2) RETURNING id
  `, [userId, testId]);
  return { attemptId: attempt.id };
};

const submitAttempt = async (userId, attemptId, answers) => {
  return transaction(async (client) => {
    const { rows: [attempt] } = await client.query(`
      SELECT ta.*, t.pass_score_pct FROM test_attempts ta
      JOIN tests t ON t.id = ta.test_id
      WHERE ta.id=$1 AND ta.user_id=$2 AND ta.submitted_at IS NULL
    `, [attemptId, userId]);
    if (!attempt) throw new AppError('Attempt not found or already submitted', 404);

    let totalPoints = 0, earnedPoints = 0;
    for (const ans of answers) {
      const { rows: [q] } = await client.query('SELECT points FROM test_questions WHERE id=$1', [ans.questionId]);
      const { rows: [opt] } = await client.query('SELECT is_correct FROM test_options WHERE id=$1 AND question_id=$2', [ans.selectedOptionId, ans.questionId]);
      if (q) {
        totalPoints += q.points;
        if (opt?.is_correct) earnedPoints += q.points;
      }
      await client.query(`
        INSERT INTO test_attempt_answers (attempt_id, question_id, selected_option_id) VALUES ($1,$2,$3)
      `, [attemptId, ans.questionId, ans.selectedOptionId]);
    }

    const scorePct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePct >= (attempt.pass_score_pct || 90);

    await client.query(`
      UPDATE test_attempts SET score_pct=$1, passed=$2, submitted_at=NOW() WHERE id=$3
    `, [scorePct, passed, attemptId]);

    const { rows: [testInfo] } = await client.query('SELECT pass_score_pct, show_answers_after FROM tests WHERE id=$1', [attempt.test_id]);

    let answersReview = [];
    if (testInfo?.show_answers_after) {
      const { rows } = await client.query(`
        SELECT tq.question_text, taa.selected_option_id,
          (SELECT option_text FROM test_options WHERE id=taa.selected_option_id) AS selected_option,
          (SELECT option_text FROM test_options WHERE question_id=tq.id AND is_correct=true LIMIT 1) AS correct_option,
          (SELECT is_correct FROM test_options WHERE id=taa.selected_option_id) AS correct
        FROM test_attempt_answers taa
        JOIN test_questions tq ON tq.id = taa.question_id
        WHERE taa.attempt_id=$1
      `, [attemptId]);
      answersReview = rows;
    }

    return {
      scorePct,
      passed,
      earnedPoints,
      totalPoints,
      correctCount: earnedPoints,
      totalCount: totalPoints,
      passScorePct: testInfo?.pass_score_pct || 90,
      showAnswers: testInfo?.show_answers_after,
      answers: answersReview,
    };
  });
};

// Parse test document directly — no AI, no token limits
const parseDocumentWithAI = (text) => {
  // Flatten: 2-column PDFs mix lines, so collapse everything to one string
  const flat = text
    .replace(/\[\d+[,\.]\d+\s*ball\]/gi, ' ')
    .replace(/[\r\n\f]+/g, ' ')
    .replace(/  +/g, ' ')
    .trim();

  // ── Collect ALL positions of "N. " and "X)" in the flat string ──────────
  const numPositions = new Map(); // num -> [{pos, end}]
  // allow optional space before dot: "36 ." and "36."
  const reNum = /\b(\d{1,3})\s*\.\s+/g;
  let m;
  while ((m = reNum.exec(flat)) !== null) {
    const n = parseInt(m[1]);
    if (n < 1 || n > 200) continue;
    if (!numPositions.has(n)) numPositions.set(n, []);
    numPositions.get(n).push({ pos: m.index, end: m.index + m[0].length });
  }

  const optPositions = []; // [{letter, pos, end}]
  // allow option letter after digit (e.g. "1A)") or common punctuation
  const reOpt = /(?<![A-Za-zʻʼ''`\u0400-\u04FF])([A-D])\)\s*/g;
  while ((m = reOpt.exec(flat)) !== null) {
    optPositions.push({ letter: m[1], pos: m.index, end: m.index + m[0].length });
  }

  // ── For each expected question number, find its options ─────────────────
  // Strategy: start from "N." and look FORWARD for the first A,B,C,D sequence.
  // 2-column PDFs interleave text, so options can be far from the question number.

  const MAX_DIST = 8000; // max chars between question start and its A)
  const OPT_DIST = 4000; // max chars between consecutive options

  const findOpt = (letter, afterPos, beforePos) =>
    optPositions.find(
      (o) => o.letter === letter && o.pos >= afterPos && o.pos < beforePos
    );

  const questions = [];
  const maxNum = numPositions.size ? Math.max(...numPositions.keys()) : 0;

  for (let n = 1; n <= maxNum; n++) {
    if (!numPositions.has(n)) continue;

    let found = null;
    for (const cand of numPositions.get(n)) {
      const aOpt = findOpt('A', cand.end, cand.end + MAX_DIST);
      if (!aOpt) continue;
      const bOpt = findOpt('B', aOpt.end, aOpt.end + OPT_DIST);
      if (!bOpt) continue;
      const cOpt = findOpt('C', bOpt.end, bOpt.end + OPT_DIST);
      if (!cOpt) continue;
      const dOpt = findOpt('D', cOpt.end, cOpt.end + OPT_DIST);
      if (!dOpt) continue;
      found = { cand, aOpt, bOpt, cOpt, dOpt };
      break;
    }
    if (!found) continue;

    const { cand, aOpt, bOpt, cOpt, dOpt } = found;

    // D option ends at the next A) or next question number, whichever comes first
    const nextA = optPositions.find((o) => o.letter === 'A' && o.pos > dOpt.end);
    const nextNum = [...numPositions.values()].flat().filter((p) => p.pos > dOpt.end).sort((a, b) => a.pos - b.pos)[0];
    const dEnd = Math.min(
      nextA ? nextA.pos : flat.length,
      nextNum ? nextNum.pos : flat.length
    );

    questions.push({
      questionNumber: n,
      questionText: flat.substring(cand.end, aOpt.pos).replace(/\s+/g, ' ').trim(),
      options: [
        flat.substring(aOpt.end, bOpt.pos).replace(/\s+/g, ' ').trim(),
        flat.substring(bOpt.end, cOpt.pos).replace(/\s+/g, ' ').trim(),
        flat.substring(cOpt.end, dOpt.pos).replace(/\s+/g, ' ').trim(),
        flat.substring(dOpt.end, dEnd).replace(/\s+/g, ' ').trim(),
      ],
      correctIndex: -1,
    });
  }

  // ── Extract passages from original line-based text ───────────────────────
  const passages = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let li = 0; li < lines.length; li++) {
    if (
      /topshiriqlarni\s+bajaring/i.test(lines[li]) ||
      /Matnni\s+o[ʻʼ''`q]/i.test(lines[li]) ||
      /Matnni\s+diqqat/i.test(lines[li]) ||
      /Matn\s+asosida/i.test(lines[li]) ||
      /quyidagi\s+matn/i.test(lines[li]) ||
      /o[ʻʼ']qing\s+va\s+topshiriq/i.test(lines[li]) ||
      /Berilgan\s+matn/i.test(lines[li])
    ) {
      const pLines = [];
      li++;
      while (
        li < lines.length &&
        !/^\d{1,3}\s*\.\s+\S/.test(lines[li]) &&
        !/^[A-D]\)/.test(lines[li]) &&
        !/topshiriqlarni\s+bajaring/i.test(lines[li]) &&
        !/Matnni\s+/i.test(lines[li]) &&
        !/Matn\s+asosida/i.test(lines[li]) &&
        !/quyidagi\s+matn/i.test(lines[li])
      ) {
        pLines.push(lines[li]);
        li++;
      }
      li--;
      const pText = pLines.join('\n').trim();
      if (pText.length > 40) {
        const nextQLine = lines.slice(li + 1).find((l) => /^\d{1,3}\.\s+\S/.test(l));
        const nextQNum = nextQLine ? parseInt(nextQLine.match(/^(\d{1,3})\./)[1]) : null;
        if (nextQNum) passages.push({ beforeQuestion: nextQNum, text: pText });
      }
    }
  }

  return { passages, questions };
};

module.exports = { getWithQuestions, createOrUpdate, startAttempt, submitAttempt, parseDocumentWithAI };
