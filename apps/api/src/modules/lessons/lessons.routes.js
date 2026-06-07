const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const ctrl = require('./lessons.controller');
const { auth, requireRole } = require('../../middleware/auth');
const { validateUpload } = require('../../middleware/uploadValidator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(auth);
router.get('/', ctrl.listByCourse);
router.post('/', requireRole('teacher', 'admin'), ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', requireRole('teacher', 'admin'), ctrl.update);
router.delete('/:id', requireRole('teacher', 'admin'), ctrl.remove);
router.post('/:id/video', requireRole('teacher', 'admin'), upload.single('video'), validateUpload('video', { fileType: 'video', maxSize: 500 * 1024 * 1024 }), ctrl.uploadVideo);
router.post('/:id/progress', requireRole('student'), ctrl.updateProgress);

module.exports = router;
