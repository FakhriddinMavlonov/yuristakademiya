const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./analytics.controller');

router.use(auth);

router.get('/student/:id', ctrl.getStudentAnalytics);
router.get('/teacher', requireRole('teacher', 'admin'), ctrl.getTeacherAnalytics);

module.exports = router;
