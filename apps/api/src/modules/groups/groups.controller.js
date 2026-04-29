const svc = require('./groups.service');

const list = async (req, res, next) => {
  try { res.json(await svc.list(req.user.id, req.user.role)); } catch (e) { next(e); }
};
const getDetail = async (req, res, next) => {
  try { res.json(await svc.getDetail(+req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.body)); } catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { res.json(await svc.update(+req.params.id, req.body)); } catch (e) { next(e); }
};
const remove = async (req, res, next) => {
  try { res.json(await svc.remove(+req.params.id)); } catch (e) { next(e); }
};
const addStudent = async (req, res, next) => {
  try { res.json(await svc.addStudent(+req.params.id, +req.body.userId)); } catch (e) { next(e); }
};
const removeStudent = async (req, res, next) => {
  try { res.json(await svc.removeStudent(+req.params.id, +req.params.userId)); } catch (e) { next(e); }
};
const setSchedule = async (req, res, next) => {
  try { res.json(await svc.setSchedule(+req.params.id, req.body.slots || [])); } catch (e) { next(e); }
};

module.exports = { list, getDetail, create, update, remove, addStudent, removeStudent, setSchedule };
