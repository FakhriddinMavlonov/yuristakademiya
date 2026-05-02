const router = require('express').Router();
const svc = require('./push.service');
const { auth } = require('../../middleware/auth');

router.get('/public-key', (_req, res) => res.json(svc.getPublicKey()));

router.post('/subscribe', auth, async (req, res, next) => {
  try {
    const ua = req.headers['user-agent'] || null;
    res.json(await svc.subscribe(req.user.id, req.body.subscription, ua));
  } catch (e) { next(e); }
});

router.post('/unsubscribe', auth, async (req, res, next) => {
  try { res.json(await svc.unsubscribe(req.body.endpoint)); } catch (e) { next(e); }
});

module.exports = router;
