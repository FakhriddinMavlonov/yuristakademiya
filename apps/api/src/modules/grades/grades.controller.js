const svc = require('./grades.service');

const getForDate = async (req, res, next) => {
  try {
    const data = await svc.getForDate(req.params.groupId, req.params.date, req.user.id, req.user.role);
    res.json(data);
  } catch (e) { next(e); }
};

const markBulk = async (req, res, next) => {
  try {
    const data = await svc.markBulk(req.params.groupId, req.params.date, req.body.records || [], req.user.id, req.user.role);
    res.json(data);
  } catch (e) { next(e); }
};

const getStudentHistory = async (req, res, next) => {
  try {
    const data = await svc.getStudentHistory(req.params.groupId, req.params.studentId, req.user.id, req.user.role);
    res.json(data);
  } catch (e) { next(e); }
};

const getGroupStats = async (req, res, next) => {
  try {
    const data = await svc.getGroupStats(req.params.groupId, req.user.id, req.user.role);
    res.json(data);
  } catch (e) { next(e); }
};

const getMyHistory = async (req, res, next) => {
  try {
    const data = await svc.getMyHistory(req.user.id);
    res.json(data);
  } catch (e) { next(e); }
};

module.exports = { getForDate, markBulk, getStudentHistory, getGroupStats, getMyHistory };
