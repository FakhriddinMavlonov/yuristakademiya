const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./ai.controller');

router.use(auth);
router.post('/generate-quiz',  requireRole('teacher', 'admin'), ctrl.generateQuiz);
router.post('/check-homework', requireRole('teacher', 'admin'), ctrl.checkHomework);

module.exports = router;
