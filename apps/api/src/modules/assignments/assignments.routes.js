const router = require('express').Router();
const ctrl = require('./assignments.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);
router.get('/pending', requireRole('teacher', 'admin'), ctrl.pending);
router.get('/lesson/:lessonId/my', requireRole('student'), ctrl.getWithSubmission);
router.post('/lesson/:lessonId', requireRole('teacher', 'admin'), ctrl.create);
router.get('/lesson/:lessonId', ctrl.getByLesson);
router.patch('/:id', requireRole('teacher', 'admin'), ctrl.update);
router.delete('/:id', requireRole('teacher', 'admin'), ctrl.deleteAssignment);
router.post('/:id/submit', requireRole('student'), ctrl.submit);
router.patch('/submission/:submissionId/grade', requireRole('teacher', 'admin'), ctrl.grade);

module.exports = router;
