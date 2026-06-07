const router = require('express').Router();
const multer = require('multer');
const ctrl = require('./courses.controller');
const { auth, requireRole } = require('../../middleware/auth');
const { validateUpload } = require('../../middleware/uploadValidator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(auth);
router.get('/', ctrl.list);
router.post('/', requireRole('teacher','admin'), ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', requireRole('teacher','admin'), ctrl.update);
router.delete('/:id', requireRole('teacher','admin'), ctrl.remove);
router.post('/:id/intro-video', requireRole('teacher','admin'), upload.single('video'), validateUpload('video', { fileType: 'video', maxSize: 500 * 1024 * 1024 }), ctrl.uploadIntroVideo);
router.post('/:id/enroll', requireRole('student'), ctrl.enroll);
router.get('/teacher/my-students', requireRole('teacher','admin'), ctrl.teacherStudents);
router.get('/teacher/student/:studentId', requireRole('teacher','admin'), ctrl.studentDetail);
router.get('/teacher/offline-students', requireRole('teacher'), ctrl.listOfflineStudents);
router.post('/teacher/offline-students', requireRole('teacher'), ctrl.registerOfflineStudent);
router.get('/:id/students', requireRole('teacher','admin'), ctrl.studentStats);

module.exports = router;
