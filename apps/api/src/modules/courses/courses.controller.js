const svc = require('./courses.service');

const list = async (req, res, next) => {
  try { res.json(await svc.list(req.user.id, req.user.role)); } catch (e) { next(e); }
};
const get = async (req, res, next) => {
  try { res.json(await svc.get(req.params.id)); } catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.user.id, req.body)); } catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { res.json(await svc.update(req.params.id, req.user.id, req.body)); } catch (e) { next(e); }
};
const uploadIntroVideo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const result = await svc.uploadIntroVideo(req.params.id, req.user.id, req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (e) { next(e); }
};
const enroll = async (req, res, next) => {
  try { res.json(await svc.enroll(req.user.id, req.params.id)); } catch (e) { next(e); }
};
const studentStats = async (req, res, next) => {
  try { res.json(await svc.studentStats(req.params.id, req.user.id)); } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.json(await svc.remove(req.params.id, req.user.id)); } catch (e) { next(e); }
};

const teacherStudents = async (req, res, next) => {
  try { res.json(await svc.getTeacherStudents(req.user.id)); } catch (e) { next(e); }
};

const studentDetail = async (req, res, next) => {
  try { res.json(await svc.getStudentDetail(req.params.studentId, req.user.id)); } catch (e) { next(e); }
};

module.exports = { list, get, create, update, uploadIntroVideo, remove, enroll, studentStats, teacherStudents, studentDetail };
