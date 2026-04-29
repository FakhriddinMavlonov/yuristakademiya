const router = require('express').Router();
const ctrl = require('./attendance.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);

router.get('/my', ctrl.getMyHistory);
router.get('/group/:groupId/date/:date', requireRole('admin', 'teacher'), ctrl.getForDate);
router.post('/group/:groupId/date/:date', requireRole('admin', 'teacher'), ctrl.markBulk);
router.get('/group/:groupId/student/:studentId', ctrl.getStudentHistory);
router.get('/group/:groupId/stats', requireRole('admin', 'teacher'), ctrl.getGroupStats);

module.exports = router;
