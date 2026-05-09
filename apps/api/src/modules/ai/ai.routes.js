const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./ai.controller');

router.use(auth);

// Teacher/Admin endpoints
router.post('/generate-quiz',  requireRole('teacher', 'admin'), ctrl.generateQuiz);
router.post('/check-homework', requireRole('teacher', 'admin'), ctrl.checkHomework);

// AI Tutor endpoints (student/teacher)
router.post('/chat', ctrl.chat);
router.get('/history', ctrl.getHistory);

module.exports = router;
