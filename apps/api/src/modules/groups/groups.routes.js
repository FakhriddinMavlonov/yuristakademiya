const router = require('express').Router();
const ctrl = require('./groups.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getDetail);
router.post('/', requireRole('admin'), ctrl.create);
router.patch('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);
router.post('/:id/students', requireRole('admin'), ctrl.addStudent);
router.delete('/:id/students/:userId', requireRole('admin'), ctrl.removeStudent);
router.put('/:id/schedule', requireRole('admin', 'teacher'), ctrl.setSchedule);

module.exports = router;
