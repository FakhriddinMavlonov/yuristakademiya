const svc = require('./parent.service');
const { query } = require('../../config/db');

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

async function getStudentStatsPublic(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Telefon raqami kiritilishi shart' });
    }

    // Verify linkage in database
    const { rows } = await query(
      'SELECT id FROM parent_links WHERE student_id = $1 AND parent_phone = $2',
      [studentId, phone]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Ushbu talabaga bog\'lanmagansiz' });
    }

    const stats = await svc.getStudentStats(studentId);
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
  getStudentStatsPublic,
  getLinkedStudents,
};
