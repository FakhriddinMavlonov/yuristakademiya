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

module.exports = { generateQuiz, checkHomework };
