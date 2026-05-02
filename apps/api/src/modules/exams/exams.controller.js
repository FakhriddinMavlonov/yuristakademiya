const svc = require('./exams.service');

const list = async (req, res, next) => {
  try { res.json(await svc.list(req.user.id, req.user.role)); } catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.user.id, req.body)); } catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { res.json(await svc.update(+req.params.id, req.user.id, req.user.role, req.body)); } catch (e) { next(e); }
};
const remove = async (req, res, next) => {
  try { res.json(await svc.remove(+req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const getStudentsForResults = async (req, res, next) => {
  try { res.json(await svc.getStudentsForResults(+req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const postResults = async (req, res, next) => {
  try { res.json(await svc.postResults(+req.params.id, req.user.id, req.user.role, req.body.results || [])); } catch (e) { next(e); }
};

module.exports = { list, create, update, remove, getStudentsForResults, postResults };
