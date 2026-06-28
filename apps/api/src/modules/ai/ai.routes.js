const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const { rateLimiter } = require('../../middleware/rateLimiter');
const ctrl = require('./ai.controller');

// AI so'rovlari qimmat — foydalanuvchi boshiga 20 ta/daqiqa
const aiLimit = rateLimiter(20, 60 * 1000);

router.use(auth);

// Teacher/Admin endpoints
router.post('/generate-quiz',  requireRole('teacher', 'admin'), aiLimit, ctrl.generateQuiz);
router.post('/check-homework', requireRole('teacher', 'admin'), aiLimit, ctrl.checkHomework);

// AI Tutor endpoints (student/teacher)
router.post('/chat',            aiLimit, ctrl.chat);
router.get('/history',          ctrl.getHistory);

// Test natijasi tushuntirish (student)
router.post('/explain-answers', aiLimit, ctrl.explainAnswers);

module.exports = router;
