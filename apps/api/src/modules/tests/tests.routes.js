const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const ctrl = require('./tests.controller');
const { auth, requireRole } = require('../../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(auth);
router.get('/:id', ctrl.get);
router.post('/lesson/:lessonId', requireRole('teacher', 'admin'), ctrl.save);
router.post('/lesson/:lessonId/parse-document', requireRole('teacher', 'admin'), upload.single('document'), ctrl.parseDocument);
router.post('/:id/start', requireRole('student'), ctrl.start);
router.post('/attempt/:attemptId/submit', requireRole('student'), ctrl.submit);

module.exports = router;
