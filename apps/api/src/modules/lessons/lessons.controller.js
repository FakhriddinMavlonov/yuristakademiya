const svc = require('./lessons.service');

const listByCourse = async (req, res, next) => {
  try { res.json(await svc.listByCourse(req.params.courseId, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const get = async (req, res, next) => {
  try { res.json(await svc.get(req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.params.courseId, req.user.id, req.body)); } catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { res.json(await svc.update(req.params.id, req.user.id, req.body)); } catch (e) { next(e); }
};
const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const result = await svc.uploadVideoToBunny(req.params.id, req.user.id, req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (e) { next(e); }
};
const updateProgress = async (req, res, next) => {
  try { res.json(await svc.updateProgress(req.user.id, req.params.id, req.body.watchedSeconds)); } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.json(await svc.remove(req.params.id, req.user.id)); } catch (e) { next(e); }
};

module.exports = { listByCourse, get, create, update, remove, uploadVideo, updateProgress };
