const svc = require('./admin.service');

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
    res.status(201).json(result);
  } catch (e) { next(e); }
};

const updateUser = async (req, res, next) => {
  try {
    const result = await svc.updateUser(req.params.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};

const updateUserRole = async (req, res, next) => {
  try {
    const result = await svc.updateUserRole(req.params.id, req.body.role);
    res.json(result);
  } catch (e) { next(e); }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const result = await svc.toggleUserActive(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

const listPayments = async (req, res, next) => {
  try { res.json(await svc.listPayments()); } catch (e) { next(e); }
};

const createPayment = async (req, res, next) => {
  try {
    const result = await svc.createPayment(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

const listSalaries = async (req, res, next) => {
  try { res.json(await svc.listSalaries()); } catch (e) { next(e); }
};

const createSalary = async (req, res, next) => {
  try {
    const result = await svc.createSalary(req.body);
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
