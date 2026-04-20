const router = require('express').Router();
const multer = require('multer');
const ctrl = require('./library.controller');
const { auth, requireRole } = require('../../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(auth, requireRole('teacher', 'admin'));
router.get('/', ctrl.list);
router.post('/', ctrl.upload);
router.post('/file', upload.single('file'), ctrl.uploadFile);
router.delete('/:id', ctrl.remove);

module.exports = router;
