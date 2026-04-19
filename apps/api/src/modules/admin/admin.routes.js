const router = require('express').Router();
const ctrl = require('./admin.controller');
const { auth, requireRole } = require('../../middleware/auth');

router.use(auth);
router.use(requireRole('admin'));

router.get('/stats', ctrl.getStats);
router.get('/student-stats', ctrl.getStudentStats);
router.get('/teacher-stats', ctrl.getTeacherStats);
router.get('/telegram-conversations', ctrl.getTelegramConversations);
router.get('/telegram-messages/:chatId', ctrl.getTelegramMessages);
router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.patch('/users/:id', ctrl.updateUser);
router.patch('/users/:id/role', ctrl.updateUserRole);
router.patch('/users/:id/toggle-active', ctrl.toggleUserActive);

router.get('/payments', ctrl.listPayments);
router.post('/payments', ctrl.createPayment);

router.get('/salaries', ctrl.listSalaries);
router.post('/salaries', ctrl.createSalary);

module.exports = router;
