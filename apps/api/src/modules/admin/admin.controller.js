const svc = require('./admin.service');
const { logAdminAction } = require('../../middleware/rateLimiter');

const getStats = async (req, res, next) => {
  try { res.json(await svc.getStats()); } catch (e) { next(e); }
};

const getStudentStats = async (req, res, next) => {
  try { res.json(await svc.getStudentStats()); } catch (e) { next(e); }
};

const getTeacherStats = async (req, res, next) => {
  try { res.json(await svc.getTeacherStats()); } catch (e) { next(e); }
};

const getTelegramConversations = async (req, res, next) => {
  try { res.json(await svc.getTelegramConversations()); } catch (e) { next(e); }
};

const getTelegramMessages = async (req, res, next) => {
  try {
    const messages = await svc.getTelegramMessages(req.params.chatId);
    res.json(messages);
  } catch (e) { next(e); }
};

const listUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    res.json(await svc.listUsers(search, role));
  } catch (e) { next(e); }
};

const createUser = async (req, res, next) => {
  try {
    const result = await svc.createUser(req.body);
    await logAdminAction(req, 'admin:createUser', { targetId: result?.id, role: req.body.role });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

const updateUser = async (req, res, next) => {
  try {
    const result = await svc.updateUser(req.params.id, req.body);
    await logAdminAction(req, 'admin:updateUser', { targetId: req.params.id, fields: Object.keys(req.body) });
    res.json(result);
  } catch (e) { next(e); }
};

const updateUserRole = async (req, res, next) => {
  try {
    const result = await svc.updateUserRole(req.params.id, req.body.role);
    await logAdminAction(req, 'admin:updateUserRole', { targetId: req.params.id, newRole: req.body.role });
    res.json(result);
  } catch (e) { next(e); }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const result = await svc.toggleUserActive(req.params.id);
    await logAdminAction(req, 'admin:toggleUserActive', { targetId: req.params.id, nowActive: result.is_active });
    res.json(result);
  } catch (e) { next(e); }
};

const listPayments = async (req, res, next) => {
  try { res.json(await svc.listPayments()); } catch (e) { next(e); }
};

const createPayment = async (req, res, next) => {
  try {
    const result = await svc.createPayment(req.body);
    await logAdminAction(req, 'admin:createPayment', { amount: req.body.amount, userId: req.body.userId });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

const listSalaries = async (req, res, next) => {
  try { res.json(await svc.listSalaries()); } catch (e) { next(e); }
};

const createSalary = async (req, res, next) => {
  try {
    const result = await svc.createSalary(req.body);
    await logAdminAction(req, 'admin:createSalary', { amount: req.body.amount, userId: req.body.userId });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

module.exports = {
  getStats,
  getStudentStats,
  getTeacherStats,
  getTelegramConversations,
  getTelegramMessages,
  listUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserActive,
  listPayments,
  createPayment,
  listSalaries,
  createSalary,
};
