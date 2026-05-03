const { query } = require('../../config/db');
const { sendBotMessage } = require('../../config/telegram');

// Map JS getDay() → 'mwf' / 'tts' membership
// JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
const isLessonDayFor = (lessonDays, jsDay) => {
  if (lessonDays === 'mwf') return jsDay === 1 || jsDay === 3 || jsDay === 5; // Mon/Wed/Fri
  if (lessonDays === 'tts') return jsDay === 2 || jsDay === 4 || jsDay === 6; // Tue/Thu/Sat
  return false;
};

// For each online student whose schedule includes "today", check if they
// finished any lesson today (test passed + homework submitted). If not, mark absent.
const runAttendanceTick = async () => {
  try {
    const today = new Date();
    const jsDay = today.getDay();
    const todayDate = today.toISOString().split('T')[0];

    const { rows: students } = await query(`
      SELECT u.id, u.first_name, u.last_name, u.lesson_days
      FROM users u
      WHERE u.role='student' AND u.is_active=true AND u.lesson_days IN ('mwf','tts')
    `);

    let markedAbsent = 0;
    for (const s of students) {
      if (!isLessonDayFor(s.lesson_days, jsDay)) continue;

      // Did this student complete any lesson today?
      const { rows: [completed] } = await query(`
        SELECT 1 FROM lesson_progress
        WHERE user_id=$1 AND is_completed=true AND DATE(completed_at)=$2
        LIMIT 1
      `, [s.id, todayDate]);
      if (completed) continue;

      // Mark absent in their primary group (if any)
      const { rows: [group] } = await query(`
        SELECT group_id FROM group_students WHERE user_id=$1 LIMIT 1
      `, [s.id]);
      if (!group) continue;

      try {
        await query(`
          INSERT INTO attendance (user_id, group_id, date, status)
          VALUES ($1, $2, $3, 'absent')
          ON CONFLICT (group_id, user_id, date) DO NOTHING
        `, [s.id, group.group_id, todayDate]);
        markedAbsent++;
      } catch (e) {
        // Some installs may not have UNIQUE constraint — ignore
      }
    }
    console.log(`[attendance] auto-tick → marked absent: ${markedAbsent}`);
  } catch (e) {
    console.error('[attendance] tick error:', e.message);
  }
};

// Send daily report to each student's parent on Telegram.
// Includes today's attendance, test scores, and homework submissions.
const runParentReportTick = async () => {
  try {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    const { rows: students } = await query(`
      SELECT id, first_name, last_name, parent_telegram_chat_id
      FROM users
      WHERE role='student' AND is_active=true AND parent_telegram_chat_id IS NOT NULL
    `);

    let sent = 0;
    for (const s of students) {
      // Aggregate today's stats
      const { rows: [tests] } = await query(`
        SELECT COUNT(*)::int AS total,
          COALESCE(ROUND(AVG(score_pct), 1), 0)::float AS avg_score,
          MAX(score_pct)::float AS best_score
        FROM test_attempts
        WHERE user_id=$1 AND DATE(submitted_at)=$2 AND submitted_at IS NOT NULL
      `, [s.id, todayDate]);

      const { rows: [hw] } = await query(`
        SELECT COUNT(*)::int AS total,
          COALESCE(ROUND(AVG(score), 1), 0)::float AS avg_score
        FROM assignment_submissions
        WHERE user_id=$1 AND DATE(submitted_at)=$2
      `, [s.id, todayDate]);

      const { rows: [att] } = await query(`
        SELECT status FROM attendance
        WHERE user_id=$1 AND date=$2 LIMIT 1
      `, [s.id, todayDate]);

      // Skip if there's nothing meaningful to report (no test, no hw, no attendance record)
      if (tests.total === 0 && hw.total === 0 && !att) continue;

      const attLabel = !att ? "—" :
        att.status === 'present' ? '✅ Keldi' :
        att.status === 'late'    ? '⏰ Kechikdi' :
        att.status === 'excused' ? '📝 Sababli' :
                                    '❌ Kelmadi';

      const text =
        `📊 ${s.first_name} ${s.last_name} — kunlik hisobot\n` +
        `📅 ${today.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
        `📋 Davomat: ${attLabel}\n` +
        (tests.total > 0
          ? `📝 Test: ${tests.total} ta yechgan, o'rtacha ${tests.avg_score}%, eng yaxshi ${tests.best_score}%\n`
          : `📝 Test: bugun yechmadi\n`) +
        (hw.total > 0
          ? `📚 Uy ishi: ${hw.total} ta topshirgan, o'rtacha ball ${hw.avg_score}\n`
          : `📚 Uy ishi: bugun topshirmadi\n`);

      const ok = await sendBotMessage(s.parent_telegram_chat_id, text);
      if (ok) sent++;
    }
    console.log(`[parent-report] daily → sent ${sent}/${students.length}`);
  } catch (e) {
    console.error('[parent-report] tick error:', e.message);
  }
};

// Run both tasks once a day at ~22:00 Tashkent time (handles timezone via UTC math)
// Tashkent is UTC+5, so 22:00 Tashkent = 17:00 UTC
let dailyTimer = null;
const startDailyScheduler = () => {
  const checkAndRun = async () => {
    const now = new Date();
    // Use UTC hours; trigger window is 17:00-17:05 UTC = 22:00-22:05 Tashkent
    if (now.getUTCHours() === 17 && now.getUTCMinutes() < 5) {
      // Guard: only run once per day
      const key = `daily_${now.toISOString().split('T')[0]}`;
      if (global._lastDailyKey === key) return;
      global._lastDailyKey = key;
      await runAttendanceTick();
      await runParentReportTick();
    }
  };
  // Check every 5 minutes
  dailyTimer = setInterval(checkAndRun, 5 * 60 * 1000);
  console.log('✅ Daily scheduler started (22:00 Tashkent → attendance + parent reports)');
  return dailyTimer;
};

module.exports = { startDailyScheduler, runAttendanceTick, runParentReportTick };
