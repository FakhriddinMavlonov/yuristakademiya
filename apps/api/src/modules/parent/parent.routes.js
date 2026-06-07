const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./parent.controller');
const reportCtrl = require('./parentReport.controller');

// ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────
router.get('/students', ctrl.getLinkedStudents);
router.get('/students/:id/stats-public', ctrl.getStudentStatsPublic);

// 📊 Parent Report - Public
router.get('/report/:studentId', reportCtrl.getStudentReport);
router.post('/report/subscribe/phone', reportCtrl.subscribeByPhone);
router.get('/report/subscription', reportCtrl.getSubscriptionStatus);

// ─── AUTHENTICATED ENDPOINTS ──────────────────────────────────────────
router.use(auth);
router.post('/link', requireRole('teacher', 'admin'), ctrl.linkParent);
router.get('/students/:id/stats', requireRole('teacher', 'admin'), ctrl.getStudentStats);

// 📊 Parent Report - Authenticated
router.post('/report/subscribe', requireRole('teacher', 'admin'), reportCtrl.subscribe);

module.exports = router;
