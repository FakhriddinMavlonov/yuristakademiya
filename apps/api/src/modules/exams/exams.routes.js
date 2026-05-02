const router = require('express').Router();
const ctrl = require('./exams.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', requireRole('teacher', 'admin'), ctrl.create);
router.patch('/:id', requireRole('teacher', 'admin'), ctrl.update);
router.delete('/:id', requireRole('teacher', 'admin'), ctrl.remove);
router.get('/:id/students', requireRole('teacher', 'admin'), ctrl.getStudentsForResults);
router.post('/:id/results', requireRole('teacher', 'admin'), ctrl.postResults);

module.exports = router;
