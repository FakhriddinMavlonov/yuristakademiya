const router = require('express').Router();
const ctrl = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { rateLimiter } = require('../../middleware/rateLimiter');

const authLimit = rateLimiter(10, 15 * 60 * 1000);

router.post('/register', authLimit, ctrl.register);
router.post('/login', authLimit, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get('/me', auth, ctrl.me);
router.get('/verify-status/:phone', ctrl.verifyStatus);

module.exports = router;
