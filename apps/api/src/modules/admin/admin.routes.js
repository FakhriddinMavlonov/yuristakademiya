const router = require('express').Router();
const ctrl = require('./admin.controller');
const { auth, requireRole } = require('../../middleware/auth');
const { generalLimiter, strictLimiter } = require('../../middleware/rateLimiter');

router.use(auth);
router.use(requireRole('admin'));

// Apply rate limiting to all admin endpoints
router.use(generalLimiter);

// Strict rate limiting for mutation endpoints
router.post('/users', strictLimiter, ctrl.createUser);
router.patch('/users/:id', strictLimiter, ctrl.updateUser);
router.patch('/users/:id/role', strictLimiter, ctrl.updateUserRole);
router.patch('/users/:id/toggle-active', strictLimiter, ctrl.toggleUserActive);
router.post('/payments', strictLimiter, ctrl.createPayment);
router.post('/salaries', strictLimiter, ctrl.createSalary);

// Read endpoints (less restrictive)
router.get('/stats', ctrl.getStats);
router.get('/student-stats', ctrl.getStudentStats);
router.get('/teacher-stats', ctrl.getTeacherStats);
router.get('/telegram-conversations', ctrl.getTelegramConversations);
router.get('/telegram-messages/:chatId', ctrl.getTelegramMessages);
router.get('/users', ctrl.listUsers);
router.get('/payments', ctrl.listPayments);
router.get('/salaries', ctrl.listSalaries);

module.exports = router;
