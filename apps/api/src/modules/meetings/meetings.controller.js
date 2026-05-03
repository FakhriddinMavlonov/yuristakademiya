const svc = require('./meetings.service');

const list = async (req, res, next) => {
  try { res.json(await svc.list(req.user.id, req.user.role)); } catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { res.status(201).json(await svc.create(req.user.id, req.body)); } catch (e) { next(e); }
};
const updateStatus = async (req, res, next) => {
  try { res.json(await svc.updateStatus(req.params.id, req.user.id, req.body.status)); } catch (e) { next(e); }
};
const studentProfiles = async (req, res, next) => {
  try { res.json(await svc.getStudentProfiles(req.params.id, req.user.id)); } catch (e) { next(e); }
};
const getJoinUrl = async (req, res, next) => {
  try { res.json(await svc.getJoinUrl(req.params.id, req.user.id)); } catch (e) { next(e); }
};
const addParticipant = async (req, res, next) => {
  try { res.json(await svc.addParticipant(req.params.id, req.user.id, req.body.participantId)); } catch (e) { next(e); }
};
const removeParticipant = async (req, res, next) => {
  try { res.json(await svc.removeParticipant(req.params.id, req.user.id, req.body.participantId)); } catch (e) { next(e); }
};
const reschedule = async (req, res, next) => {
  try { res.json(await svc.reschedule(req.params.id, req.user.id, req.body.scheduledAt)); } catch (e) { next(e); }
};
const readyStudents = async (req, res, next) => {
  try { res.json(await svc.getReadyStudentsForLesson(req.params.lessonId, req.user.id)); } catch (e) { next(e); }
};
const scheduleLessonMeeting = async (req, res, next) => {
  try {
    res.status(201).json(await svc.scheduleLessonMeeting(
      req.params.lessonId, req.user.id, req.body.participantIds, req.body.scheduledAt
    ));
  } catch (e) { next(e); }
};

const coursesWithLessons = async (req, res, next) => {
  try { res.json(await svc.getCoursesWithLessonStats(req.user.id)); } catch (e) { next(e); }
};

module.exports = { list, create, updateStatus, studentProfiles, getJoinUrl, addParticipant, removeParticipant, reschedule, readyStudents, scheduleLessonMeeting, coursesWithLessons };
