const reportService = require('./parentReport.service');

/**
 * GET /api/parent/report/:studentId?phone=...
 * Get weekly report for a specific student (public, verified by phone)
 */
const getStudentReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Telefon raqami kiritilishi shart' });
    }

    // Verify parent link
    const { query } = require('../../config/db');
    const { rows } = await query(
      'SELECT id FROM parent_links WHERE student_id = $1 AND parent_phone = $2',
      [studentId, phone]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Ushbu talabaga bog\'lanmagansiz' });
    }

    const report = await reportService.getWeeklyReport(studentId);
    res.json(report);
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/parent/report/subscribe
 * Subscribe to automatic reports (auth required)
 */
const subscribe = async (req, res, next) => {
  try {
    const { parentPhone, studentId, frequency, isActive } = req.body;
    if (!parentPhone || !studentId) {
      return res.status(400).json({ error: 'Telefon raqami va talaba IDsi kiritilishi shart' });
    }

    // Check teacher/admin permission or parent link
    const { query } = require('../../config/db');
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      // Teacher/admin can set up for any linked parent
    }

    // Get telegram chat id from parent links or user
    const { rows: links } = await query(
      'SELECT pl.parent_phone, u.telegram_chat_id, u.parent_telegram_phone FROM parent_links pl JOIN users u ON u.id = pl.student_id WHERE pl.parent_phone = $1 AND pl.student_id = $2',
      [parentPhone, studentId]
    );

    let telegramChatId = null;
    if (links.length > 0) {
      // Try to find telegram chat id for this parent phone
      const { rows: tgUsers } = await query(
        'SELECT telegram_chat_id FROM users WHERE parent_telegram_phone = $1 AND telegram_chat_id IS NOT NULL LIMIT 1',
        [parentPhone]
      );
      if (tgUsers.length > 0) {
        telegramChatId = tgUsers[0].telegram_chat_id;
      }
    }

    const result = await reportService.setSubscription(parentPhone, studentId, {
      isActive: isActive !== undefined ? isActive : true,
      frequency: frequency || 'weekly',
      telegramChatId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/parent/report/subscription?phone=...&studentId=...
 * Get subscription status
 */
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const { phone, studentId } = req.query;
    if (!phone || !studentId) {
      return res.status(400).json({ error: 'Telefon raqami va talaba IDsi kiritilishi shart' });
    }

    const result = await reportService.getSubscription(phone, studentId);
    res.json(result || { is_active: false });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/parent/report/subscribe/phone
 * Subscribe via phone number (public, from parent dashboard)
 */
const subscribeByPhone = async (req, res, next) => {
  try {
    const { phone, studentId, frequency } = req.body;
    if (!phone || !studentId) {
      return res.status(400).json({ error: 'Telefon raqami va talaba IDsi kiritilishi shart' });
    }

    // Verify parent link
    const { query } = require('../../config/db');
    const { rows: links } = await query(
      'SELECT id FROM parent_links WHERE parent_phone = $1 AND student_id = $2',
      [phone, studentId]
    );
    if (links.length === 0) {
      return res.status(403).json({ error: 'Ushbu talabaga bog\'lanmagansiz' });
    }

    // Get telegram chat from user's parent_telegram_phone
    const { rows: tgUsers } = await query(
      'SELECT telegram_chat_id FROM users WHERE parent_telegram_phone = $1 AND telegram_chat_id IS NOT NULL LIMIT 1',
      [phone]
    );

    const result = await reportService.setSubscription(phone, studentId, {
      isActive: true,
      frequency: frequency || 'weekly',
      telegramChatId: tgUsers.length > 0 ? tgUsers[0].telegram_chat_id : null,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getStudentReport,
  subscribe,
  getSubscriptionStatus,
  subscribeByPhone,
};
