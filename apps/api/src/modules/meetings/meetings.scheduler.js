const { query } = require('../../config/db');
const { sendMeetingReminder } = require('../../config/telegram');
const { signMagicToken } = require('../auth/auth.service');

// Each entry: { type, targetMinutes, window }
// window = how many minutes around the target to fire (catches the scheduler tick)
const REMINDER_SLOTS = [
  { type: '24h',  targetMinutes: 1440, window: 3 },
  { type: '12h',  targetMinutes:  720, window: 3 },
  { type: '6h',   targetMinutes:  360, window: 3 },
  { type: '3h',   targetMinutes:  180, window: 3 },
  { type: '2h',   targetMinutes:  120, window: 3 },
  { type: '1h',   targetMinutes:   60, window: 3 },
  { type: '50m',  targetMinutes:   50, window: 2 },
  { type: '40m',  targetMinutes:   40, window: 2 },
  { type: '30m',  targetMinutes:   30, window: 2 },
  { type: '20m',  targetMinutes:   20, window: 2 },
  { type: '10m',  targetMinutes:   10, window: 2 },
  { type: '5m',   targetMinutes:    5, window: 2 },
];

const getRecipients = async (meeting) => {
  const sets = new Set();

  const { rows: explicit } = await query(
    'SELECT user_id FROM meeting_participants WHERE meeting_id=$1', [meeting.id]
  );
  explicit.forEach(r => sets.add(r.user_id));

  if (meeting.audience_type === 'all' && meeting.course_id) {
    const { rows } = await query('SELECT user_id FROM enrollments WHERE course_id=$1', [meeting.course_id]);
    rows.forEach(r => sets.add(r.user_id));
  }
  if (meeting.group_id) {
    const { rows } = await query('SELECT user_id FROM group_students WHERE group_id=$1', [meeting.group_id]);
    rows.forEach(r => sets.add(r.user_id));
  }
  return [...sets];
};

const runReminderTick = async () => {
  try {
    const now = new Date();

    // Only look at scheduled meetings in the next 25 hours
    const { rows: meetings } = await query(`
      SELECT m.*, u.first_name||' '||u.last_name AS teacher_name
      FROM meetings m
      JOIN users u ON u.id = m.teacher_id
      WHERE m.status = 'scheduled'
        AND m.scheduled_at > NOW()
        AND m.scheduled_at < NOW() + INTERVAL '25 hours'
    `);

    for (const meeting of meetings) {
      const minutesLeft = (new Date(meeting.scheduled_at) - now) / 60000;

      // Determine which slots to fire for this tick
      const toSend = REMINDER_SLOTS.filter(slot =>
        minutesLeft >= (slot.targetMinutes - slot.window) &&
        minutesLeft <= (slot.targetMinutes + slot.window)
      );
      if (!toSend.length) continue;

      // Check which of these haven't been sent yet (single query per meeting)
      const alreadySent = await query(
        'SELECT reminder_type FROM meeting_reminder_log WHERE meeting_id=$1',
        [meeting.id]
      );
      const sentTypes = new Set(alreadySent.rows.map(r => r.reminder_type));
      const pending = toSend.filter(s => !sentTypes.has(s.type));
      if (!pending.length) continue;

      // Get recipient list once for this meeting
      const userIds = await getRecipients(meeting);
      if (!userIds.length) continue;

      // Get telegram_chat_id for each recipient
      const { rows: chatRows } = await query(
        'SELECT id, telegram_chat_id FROM users WHERE id = ANY($1::int[]) AND telegram_chat_id IS NOT NULL',
        [userIds]
      );
      if (!chatRows.length) continue;

      for (const slot of pending) {
        // Mark as sent first (prevents double-send if tick overlaps)
        try {
          await query(
            'INSERT INTO meeting_reminder_log (meeting_id, reminder_type) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [meeting.id, slot.type]
          );
        } catch { continue; }

        let sent = 0;
        for (const row of chatRows) {
          // For close reminders (10m, 5m) include a join deeplink
          const magicToken = ['10m', '5m'].includes(slot.type)
            ? signMagicToken(row.id) : null;

          const ok = await sendMeetingReminder({
            chatId: row.telegram_chat_id,
            title: meeting.title,
            teacherName: meeting.teacher_name,
            scheduledAt: meeting.scheduled_at,
            reminderType: slot.type,
            meetingId: meeting.id,
            magicToken,
          });
          if (ok) sent++;
        }
        console.log(`[reminder] meeting=${meeting.id} type=${slot.type} sent=${sent}/${chatRows.length}`);
      }
    }
  } catch (e) {
    console.error('[reminder] tick error:', e.message);
  }
};

const startReminderScheduler = () => {
  // Run once immediately, then every minute
  runReminderTick();
  const interval = setInterval(runReminderTick, 60 * 1000);
  console.log('✅ Meeting reminder scheduler started (every 1 min)');
  return interval;
};

module.exports = { startReminderScheduler };
