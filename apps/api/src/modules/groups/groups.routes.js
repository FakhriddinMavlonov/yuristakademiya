const router = require('express').Router();
const ctrl = require('./groups.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getDetail);
router.post('/', requireRole('admin', 'teacher'), ctrl.create);
router.patch('/:id', requireRole('admin', 'teacher'), ctrl.update);
router.delete('/:id', requireRole('admin', 'teacher'), ctrl.remove);
router.post('/:id/students', requireRole('admin', 'teacher'), ctrl.addStudent);
router.delete('/:id/students/:userId', requireRole('admin', 'teacher'), ctrl.removeStudent);
router.put('/:id/schedule', requireRole('admin', 'teacher'), ctrl.setSchedule);

module.exports = router;
