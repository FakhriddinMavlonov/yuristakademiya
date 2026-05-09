const svc = require('./analytics.service');

async function getStudentAnalytics(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const teacherId = req.user.role === 'teacher' ? req.user.id : null;

    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await svc.getStudentAnalytics(studentId, teacherId);
    res.json(analytics);
  } catch (e) {
    next(e);
  }
}

async function getTeacherAnalytics(req, res, next) {
  try {
    const analytics = await svc.getTeacherAnalytics(req.user.id);
    res.json(analytics);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getStudentAnalytics,
  getTeacherAnalytics,
};
