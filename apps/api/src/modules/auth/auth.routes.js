const router = require('express').Router();
const ctrl = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { rateLimiter } = require('../../middleware/rateLimiter');

const authLimit = rateLimiter(10, 15 * 60 * 1000);

// Ro'yxatdan o'tish faqat Telegram bot orqali. Eski endpoint 410 qaytaradi.
router.post('/register', authLimit, (req, res) => {
  const botUsername = process.env.VITE_TELEGRAM_BOT_USERNAME || 'yuristakademiyabot';
  res.status(410).json({
    message: "Ro'yxatdan o'tish faqat Telegram bot orqali amalga oshiriladi.",
    botUrl: `https://t.me/${botUsername}`,
  });
});
router.post('/login', authLimit, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/magic-exchange', ctrl.magicExchange);
router.get('/me', auth, ctrl.me);
router.patch('/me', auth, ctrl.updateProfile);
router.get('/verify-status/:phone', ctrl.verifyStatus);

module.exports = router;
