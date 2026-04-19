const router = require('express').Router();
const ctrl = require('./meetings.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', requireRole('teacher', 'admin'), ctrl.create);
router.get('/:id/join', ctrl.getJoinUrl);
router.patch('/:id/status', requireRole('teacher', 'admin'), ctrl.updateStatus);
router.get('/:id/students', requireRole('teacher', 'admin'), ctrl.studentProfiles);
router.post('/:id/participants', requireRole('teacher', 'admin'), ctrl.addParticipant);
router.delete('/:id/participants', requireRole('teacher', 'admin'), ctrl.removeParticipant);

module.exports = router;
