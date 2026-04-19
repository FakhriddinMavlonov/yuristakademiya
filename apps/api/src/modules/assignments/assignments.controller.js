const svc = require('./assignments.service');

const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.params.lessonId, req.user.id, req.body)); } catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { res.json(await svc.update(req.params.id, req.user.id, req.body)); } catch (e) { next(e); }
};
const deleteAssignment = async (req, res, next) => {
  try { res.json(await svc.deleteAssignment(req.params.id, req.user.id)); } catch (e) { next(e); }
};
const getByLesson = async (req, res, next) => {
  try { res.json(await svc.getByLesson(req.params.lessonId)); } catch (e) { next(e); }
};
const getWithSubmission = async (req, res, next) => {
  try { res.json(await svc.getWithSubmission(req.params.lessonId, req.user.id)); } catch (e) { next(e); }
};
const pending = async (req, res, next) => {
  try { res.json(await svc.pending(req.user.id)); } catch (e) { next(e); }
};
const submit = async (req, res, next) => {
  try { res.json(await svc.submit(req.user.id, req.params.id, req.body)); } catch (e) { next(e); }
};
const grade = async (req, res, next) => {
  try { res.json(await svc.grade(req.user.id, req.params.submissionId, req.body)); } catch (e) { next(e); }
};

module.exports = { create, update, deleteAssignment, getByLesson, getWithSubmission, pending, submit, grade };
