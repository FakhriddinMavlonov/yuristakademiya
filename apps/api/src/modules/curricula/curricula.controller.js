const svc = require('./curricula.service');

const list = async (req, res, next) => {
  try {
    const data = await svc.list(req.user.id);
    res.json(data);
  } catch (e) { next(e); }
};

const getDetail = async (req, res, next) => {
  try {
    const data = await svc.getDetail(req.params.id, req.user.id);
    res.json(data);
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const data = await svc.create(req.user.id, req.body);
    res.status(201).json(data);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const data = await svc.update(req.params.id, req.user.id, req.body);
    res.json(data);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const result = await svc.remove(req.params.id, req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

const addLesson = async (req, res, next) => {
  try {
    const data = await svc.addLesson(req.params.id, req.user.id, req.body);
    res.status(201).json(data);
  } catch (e) { next(e); }
};

const updateLesson = async (req, res, next) => {
  try {
    const data = await svc.updateLesson(req.params.lid, req.body);
    res.json(data);
  } catch (e) { next(e); }
};

const removeLesson = async (req, res, next) => {
  try {
    const result = await svc.removeLesson(req.params.lid);
    res.json(result);
  } catch (e) { next(e); }
};

const addTask = async (req, res, next) => {
  try {
    const data = await svc.addTask(req.params.lid, req.body);
    res.status(201).json(data);
  } catch (e) { next(e); }
};

const removeTask = async (req, res, next) => {
  try {
    const result = await svc.removeTask(req.params.tid);
    res.json(result);
  } catch (e) { next(e); }
};

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove,
  addLesson,
  updateLesson,
  removeLesson,
  addTask,
  removeTask,
};
