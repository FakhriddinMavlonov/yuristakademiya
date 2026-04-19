const router = require('express').Router();
const ctrl = require('./library.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth, requireRole('teacher', 'admin'));
router.get('/', ctrl.list);
router.post('/', ctrl.upload);
router.delete('/:id', ctrl.remove);

module.exports = router;
