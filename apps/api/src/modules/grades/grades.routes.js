const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./grades.controller');

router.use(auth);

router.get('/my', ctrl.getMyHistory);
router.get('/group/:groupId/date/:date', requireRole('admin', 'teacher'), ctrl.getForDate);
router.post('/group/:groupId/date/:date', requireRole('admin', 'teacher'), ctrl.markBulk);
router.get('/group/:groupId/student/:studentId', requireRole('admin', 'teacher'), ctrl.getStudentHistory);
router.get('/group/:groupId/stats', requireRole('admin', 'teacher'), ctrl.getGroupStats);

module.exports = router;
