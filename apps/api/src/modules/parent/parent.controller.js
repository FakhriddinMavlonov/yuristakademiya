const svc = require('./parent.service');

async function linkParent(req, res, next) {
  try {
    const { student_id, phone, name } = req.body;
    const link = await svc.linkParent(student_id, phone, name);
    res.status(201).json(link);
  } catch (e) {
    next(e);
  }
}

async function getStudentStats(req, res, next) {
  try {
    const { id } = req.params;
    const stats = await svc.getStudentStats(parseInt(id));
    res.json(stats);
  } catch (e) {
    next(e);
  }
}

async function getLinkedStudents(req, res, next) {
  try {
    const { phone } = req.query;
    const students = await svc.getLinkedStudents(phone);
    res.json(students);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  linkParent,
  getStudentStats,
  getLinkedStudents,
};
