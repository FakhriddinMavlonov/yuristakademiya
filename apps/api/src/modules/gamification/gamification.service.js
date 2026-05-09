const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const LEVEL_XP_THRESHOLD = 100;
const XP_AMOUNTS = {
  lesson_complete: 20,
  test_pass: 50,
  homework_submit: 30,
  daily_streak: 10,
};

const BADGES = {
  first_lesson: { key: 'first_lesson', name: 'Birinchi Dars', emoji: '📚' },
  streak_3: { key: 'streak_3', name: '3 Kun Ketma-ket', emoji: '🔥' },
  streak_7: { key: 'streak_7', name: '1 Hafta Ketma-ket', emoji: '🌟' },
  streak_30: { key: 'streak_30', name: '1 Oy Ketma-ket', emoji: '🏆' },
  perfect_test: { key: 'perfect_test', name: '100% Test', emoji: '🎯' },
  first_homework: { key: 'first_homework', name: 'Birinchi Uy Ishi', emoji: '✍️' },
  top3_leaderboard: { key: 'top3_leaderboard', name: 'Top 3', emoji: '🥇' },
  first_course_complete: { key: 'first_course_complete', name: 'Birinchi Kurs', emoji: '🎓' },
  xp_100: { key: 'xp_100', name: '100 XP', emoji: '⭐' },
  xp_500: { key: 'xp_500', name: '500 XP', emoji: '💫' },
  xp_1000: { key: 'xp_1000', name: '1000 XP', emoji: '👑' },
};

async function ensureUserPoints(userId) {
  const result = await query('SELECT id FROM user_points WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    await query(
      'INSERT INTO user_points (user_id, total_xp, current_level, daily_streak, longest_streak, last_active_date, streak_freeze_count) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, 0, 1, 0, 0, new Date().toISOString().split('T')[0], 0]
    );
  }
}

async function getStats(userId) {
  await ensureUserPoints(userId);
  const pointsRes = await query('SELECT * FROM user_points WHERE user_id = $1', [userId]);
  const badgesRes = await query('SELECT badge_key, earned_at FROM user_achievements WHERE user_id = $1 ORDER BY earned_at', [userId]);

  const points = pointsRes.rows[0];
  const badges = badgesRes.rows;

  const nextLevelXp = points.current_level * LEVEL_XP_THRESHOLD;

  return {
    userId,
    total_xp: points.total_xp,
    current_level: points.current_level,
    xp_in_level: points.total_xp - ((points.current_level - 1) * LEVEL_XP_THRESHOLD),
    xp_to_next_level: nextLevelXp - points.total_xp,
    daily_streak: points.daily_streak,
    longest_streak: points.longest_streak,
    last_active_date: points.last_active_date,
    badges: badges.map(b => BADGES[b.badge_key] || { key: b.badge_key, name: b.badge_key, emoji: '🎖️' }),
  };
}

async function awardXP(userId, amount, reason = 'activity') {
  await ensureUserPoints(userId);

  const res = await query(
    'UPDATE user_points SET total_xp = total_xp + $1 WHERE user_id = $2 RETURNING total_xp, current_level',
    [amount, userId]
  );

  if (res.rows.length === 0) throw new AppError('User points not found', 404);

  const { total_xp, current_level } = res.rows[0];
  const nextLevelXp = (current_level + 1) * LEVEL_XP_THRESHOLD;

  if (total_xp >= nextLevelXp) {
    await query('UPDATE user_points SET current_level = current_level + 1 WHERE user_id = $1', [userId]);
  }

  await checkAndAwardBadges(userId);
  return { total_xp, current_level };
}

async function updateStreak(userId) {
  await ensureUserPoints(userId);

  const res = await query('SELECT daily_streak, longest_streak, last_active_date FROM user_points WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) throw new AppError('User points not found', 404);

  const { daily_streak: current_streak, longest_streak, last_active_date } = res.rows[0];
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let new_streak = current_streak;

  if (last_active_date === today) {
    return { daily_streak: new_streak, longest_streak };
  }

  if (last_active_date === yesterday) {
    new_streak += 1;
  } else {
    new_streak = 1;
  }

  const new_longest = Math.max(longest_streak, new_streak);

  await query(
    'UPDATE user_points SET daily_streak = $1, longest_streak = $2, last_active_date = $3 WHERE user_id = $4',
    [new_streak, new_longest, today, userId]
  );

  await awardXP(userId, XP_AMOUNTS.daily_streak, 'daily_streak');
  await checkAndAwardBadges(userId);

  return { daily_streak: new_streak, longest_streak: new_longest };
}

async function checkAndAwardBadges(userId) {
  const pointsRes = await query('SELECT total_xp, daily_streak FROM user_points WHERE user_id = $1', [userId]);
  if (pointsRes.rows.length === 0) return;

  const { total_xp, daily_streak } = pointsRes.rows[0];
  const badgesToCheck = [];

  if (daily_streak >= 3) badgesToCheck.push('streak_3');
  if (daily_streak >= 7) badgesToCheck.push('streak_7');
  if (daily_streak >= 30) badgesToCheck.push('streak_30');
  if (total_xp >= 100) badgesToCheck.push('xp_100');
  if (total_xp >= 500) badgesToCheck.push('xp_500');
  if (total_xp >= 1000) badgesToCheck.push('xp_1000');

  for (const badge of badgesToCheck) {
    const existing = await query('SELECT id FROM user_achievements WHERE user_id = $1 AND badge_key = $2', [userId, badge]);
    if (existing.rows.length === 0) {
      await query(
        'INSERT INTO user_achievements (user_id, badge_key) VALUES ($1, $2)',
        [userId, badge]
      );
    }
  }
}

async function getLeaderboard(groupId = null) {
  let sql = `
    SELECT
      up.user_id,
      u.first_name,
      u.last_name,
      up.total_xp,
      up.daily_streak,
      up.current_level,
      ROW_NUMBER() OVER (ORDER BY up.total_xp DESC) as rank
    FROM user_points up
    JOIN users u ON u.id = up.user_id
  `;
  const params = [];

  if (groupId) {
    sql += ` WHERE u.id IN (SELECT user_id FROM group_students WHERE group_id = $1) `;
    params.push(groupId);
  }

  sql += ` ORDER BY up.total_xp DESC LIMIT 20`;

  const res = await query(sql, params);
  return res.rows.map(row => ({
    rank: row.rank,
    user_id: row.user_id,
    name: `${row.first_name} ${row.last_name}`,
    total_xp: row.total_xp,
    daily_streak: row.daily_streak,
    current_level: row.current_level,
  }));
}

module.exports = {
  getStats,
  awardXP,
  updateStreak,
  checkAndAwardBadges,
  getLeaderboard,
  ensureUserPoints,
  XP_AMOUNTS,
};
