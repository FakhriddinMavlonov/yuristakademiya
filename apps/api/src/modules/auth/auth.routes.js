const router = require('express').Router();
const ctrl = require('./auth.controller');
const { auth } = require('../../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get('/me', auth, ctrl.me);
router.get('/verify-status/:phone', ctrl.verifyStatus);

module.exports = router;
