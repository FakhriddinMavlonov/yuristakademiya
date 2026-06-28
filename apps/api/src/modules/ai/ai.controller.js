const svc = require('./ai.service');

const generateQuiz = async (req, res, next) => {
  try {
    const { topic, count, difficulty } = req.body;
    if (!topic || !topic.trim()) return res.status(400).json({ message: 'Mavzu nomi kiritilmagan' });
    const n = Math.min(Math.max(parseInt(count) || 10, 1), 30);
    const questions = await svc.generateQuiz({ topic: topic.trim(), count: n, difficulty: difficulty || 'medium' });
    res.json({ questions });
  } catch (e) { next(e); }
};

const checkHomework = async (req, res, next) => {
  try {
    const { content, assignmentTitle } = req.body;
    const result = await svc.checkHomework({ content, assignmentTitle: assignmentTitle || 'Uy ishi' });
    res.json(result);
  } catch (e) { next(e); }
};

const chat = async (req, res, next) => {
  try {
    const { message, lesson_id, group_lesson_id } = req.body;
    const result = await svc.chat({
      userId: req.user.id,
      message,
      lessonId: lesson_id || null,
      groupLessonId: group_lesson_id || null,
    });
    res.json(result);
  } catch (e) { next(e); }
};

const getHistory = async (req, res, next) => {
  try {
    const { lesson_id } = req.query;
    const history = await svc.getChatHistory(req.user.id, lesson_id ? parseInt(lesson_id) : null);
    res.json(history);
  } catch (e) { next(e); }
};

const explainAnswers = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const result = await svc.explainWrongAnswers({ answers });
    res.json(result);
  } catch (e) { next(e); }
};

module.exports = { generateQuiz, checkHomework, chat, getHistory, explainAnswers };
