const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./parent.controller');

router.get('/students', ctrl.getLinkedStudents); // Public endpoint for parent login

router.use(auth);
router.post('/link', requireRole('teacher', 'admin'), ctrl.linkParent);
router.get('/students/:id/stats', requireRole('teacher', 'admin'), ctrl.getStudentStats);

module.exports = router;
