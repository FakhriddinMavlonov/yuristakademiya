const router = require('express').Router();
const ctrl = require('./groups.controller');
const { auth, requireRole } = require('../../middleware/auth');
const multer = require('multer');
const { validateUpload } = require('../../middleware/uploadValidator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(auth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getDetail);
router.post('/', requireRole('admin', 'teacher'), ctrl.create);
router.patch('/:id', requireRole('admin', 'teacher'), ctrl.update);
router.delete('/:id', requireRole('admin', 'teacher'), ctrl.remove);
router.post('/:id/students', requireRole('admin', 'teacher'), ctrl.addStudent);
router.delete('/:id/students/:userId', requireRole('admin', 'teacher'), ctrl.removeStudent);
router.put('/:id/schedule', requireRole('admin', 'teacher'), ctrl.setSchedule);

// Group Lessons (Darslar)
router.get('/:id/lessons', ctrl.getGroupLessons);
router.post('/:id/apply-curriculum', requireRole('admin', 'teacher'), ctrl.applyCurriculum);
router.post('/:id/lessons', requireRole('admin', 'teacher'), ctrl.addGroupLesson);
router.patch('/:id/lessons/:lid', requireRole('admin', 'teacher'), ctrl.updateGroupLesson);
router.post('/:id/lessons/:lid/video', requireRole('admin', 'teacher'), upload.single('video'), validateUpload('video', { fileType: 'video', maxSize: 500 * 1024 * 1024 }), ctrl.uploadGroupLessonVideo);
router.post('/:id/lessons/:lid/materials', requireRole('admin', 'teacher'), upload.single('file'), validateUpload('file', { fileType: 'document', maxSize: 50 * 1024 * 1024 }), ctrl.uploadGroupLessonMaterial);
router.post('/:id/lessons/:lid/complete', requireRole('admin', 'teacher'), ctrl.completeGroupLesson);
router.delete('/:id/lessons/:lid', requireRole('admin', 'teacher'), ctrl.removeGroupLesson);

module.exports = router;
