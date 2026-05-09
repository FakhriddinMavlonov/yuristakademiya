const express = require('express');
const { requireRole } = require('../../middleware/auth');
const ctrl = require('./curricula.controller');

const router = express.Router();

router.get('/', requireRole('teacher', 'admin'), ctrl.list);
router.post('/', requireRole('teacher', 'admin'), ctrl.create);
router.get('/:id', requireRole('teacher', 'admin'), ctrl.getDetail);
router.patch('/:id', requireRole('teacher', 'admin'), ctrl.update);
router.delete('/:id', requireRole('teacher', 'admin'), ctrl.remove);

router.post('/:id/lessons', requireRole('teacher', 'admin'), ctrl.addLesson);
router.patch('/:id/lessons/:lid', requireRole('teacher', 'admin'), ctrl.updateLesson);
router.delete('/:id/lessons/:lid', requireRole('teacher', 'admin'), ctrl.removeLesson);

router.post('/:id/lessons/:lid/tasks', requireRole('teacher', 'admin'), ctrl.addTask);
router.delete('/:id/lessons/:lid/tasks/:tid', requireRole('teacher', 'admin'), ctrl.removeTask);

module.exports = router;
