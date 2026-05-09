const svc = require('./groups.service');

const list = async (req, res, next) => {
  try { res.json(await svc.list(req.user.id, req.user.role)); } catch (e) { next(e); }
};
const getDetail = async (req, res, next) => {
  try { res.json(await svc.getDetail(+req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.body, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { res.json(await svc.update(+req.params.id, req.body, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const remove = async (req, res, next) => {
  try { res.json(await svc.remove(+req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const addStudent = async (req, res, next) => {
  try { res.json(await svc.addStudent(+req.params.id, +req.body.userId, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const removeStudent = async (req, res, next) => {
  try { res.json(await svc.removeStudent(+req.params.id, +req.params.userId, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const setSchedule = async (req, res, next) => {
  try { res.json(await svc.setSchedule(+req.params.id, req.body.slots || [])); } catch (e) { next(e); }
};

const getGroupLessons = async (req, res, next) => {
  try { res.json(await svc.getGroupLessons(+req.params.id, req.user.role, req.user.id)); } catch (e) { next(e); }
};

const applyCurriculum = async (req, res, next) => {
  try { res.json(await svc.applyCurriculum(+req.params.id, req.body.curriculumId, req.user.id)); } catch (e) { next(e); }
};

const addGroupLesson = async (req, res, next) => {
  try { res.status(201).json(await svc.addGroupLesson(+req.params.id, req.body, req.user.id)); } catch (e) { next(e); }
};

const updateGroupLesson = async (req, res, next) => {
  try { res.json(await svc.updateGroupLesson(+req.params.lid, req.body, req.user.id)); } catch (e) { next(e); }
};

const uploadGroupLessonVideo = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file provided');
    const lesson = await svc.uploadGroupLessonVideo(+req.params.lid, req.file.buffer, req.user.id);
    res.json(lesson);
  } catch (e) { next(e); }
};

const uploadGroupLessonMaterial = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file provided');
    const material = await svc.addGroupLessonMaterial(
      +req.params.lid,
      req.file.buffer,
      req.body.name || req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.user.id
    );
    res.status(201).json(material);
  } catch (e) { next(e); }
};

const completeGroupLesson = async (req, res, next) => {
  try { res.json(await svc.completeGroupLesson(+req.params.lid, req.user.id)); } catch (e) { next(e); }
};

const removeGroupLesson = async (req, res, next) => {
  try { res.json(await svc.removeGroupLesson(+req.params.lid, req.user.id)); } catch (e) { next(e); }
};

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove,
  addStudent,
  removeStudent,
  setSchedule,
  getGroupLessons,
  applyCurriculum,
  addGroupLesson,
  updateGroupLesson,
  uploadGroupLessonVideo,
  uploadGroupLessonMaterial,
  completeGroupLesson,
  removeGroupLesson,
};
