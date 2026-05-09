const router = require('express').Router();
const { auth } = require('../../middleware/auth');
const ctrl = require('./gamification.controller');

router.use(auth);

router.get('/stats', ctrl.getStats);
router.get('/leaderboard', ctrl.getLeaderboard);
router.post('/streak', ctrl.updateStreak);

module.exports = router;
