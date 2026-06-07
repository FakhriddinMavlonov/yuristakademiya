const cron = require('node-cron');
const { sendParentReport, sendParentDailyBrief } = require('../../config/telegram');
const reportService = require('./parentReport.service');

/**
 * Start parent report schedulers.
 *
 * - Weekly reports: Every Sunday at 20:00 (Tashkent time)
 * - Daily briefs: Every day at 18:00 (Tashkent time)
 */
const startParentReportScheduler = () => {
  // ─── WEEKLY REPORT (Yakshanba 20:00) ──────────────────────────────────
  cron.schedule('0 20 * * 0', async () => {
    console.log('[parentReport] 🚀 Starting weekly report run...');
    try {
      const subscriptions = await reportService.getActiveSubscriptions();
      let sentCount = 0;
      let errorCount = 0;

      for (const sub of subscriptions) {
        try {
          // Only send weekly frequency ones on this schedule
          if (sub.frequency !== 'weekly') continue;

          const report = await reportService.getWeeklyReport(sub.student_id);
          const chatId = sub.chat_id || sub.telegram_chat_id;

          if (chatId) {
            const ok = await sendParentReport(report, chatId);
            if (ok) {
              await reportService.saveReportLog(sub.parent_phone, sub.student_id, report);
              await reportService.updateLastSent(sub.id);
              sentCount++;
            } else {
              errorCount++;
            }
          }
        } catch (err) {
          console.error(`[parentReport] Error for student ${sub.student_id}:`, err.message);
          errorCount++;
        }
      }

      console.log(`[parentReport] ✅ Weekly reports sent: ${sentCount}, errors: ${errorCount}`);
    } catch (err) {
      console.error('[parentReport] Fatal error in weekly scheduler:', err.message);
    }
  }, {
    timezone: 'Asia/Tashkent',
  });

  // ─── DAILY BRIEF (Har kuni 18:00) ────────────────────────────────────
  cron.schedule('0 18 * * *', async () => {
    console.log('[parentReport] 🚀 Starting daily brief run...');
    try {
      const subscriptions = await reportService.getActiveSubscriptions();
      let sentCount = 0;
      let errorCount = 0;

      for (const sub of subscriptions) {
        try {
          // Only send daily frequency ones
          if (sub.frequency !== 'daily') continue;

          const report = await reportService.getWeeklyReport(sub.student_id);
          const chatId = sub.chat_id || sub.telegram_chat_id;

          if (chatId) {
            const ok = await sendParentDailyBrief(report, chatId);
            if (ok) {
              await reportService.saveReportLog(sub.parent_phone, sub.student_id, report);
              await reportService.updateLastSent(sub.id);
              sentCount++;
            } else {
              errorCount++;
            }
          }
        } catch (err) {
          console.error(`[parentReport] Daily brief error for ${sub.student_id}:`, err.message);
          errorCount++;
        }
      }

      console.log(`[parentReport] ✅ Daily briefs sent: ${sentCount}, errors: ${errorCount}`);
    } catch (err) {
      console.error('[parentReport] Fatal error in daily scheduler:', err.message);
    }
  }, {
    timezone: 'Asia/Tashkent',
  });

  console.log('✅ Parent report scheduler started (weekly: Sun 20:00, daily: 18:00 Tashkent)');
};

module.exports = { startParentReportScheduler };
