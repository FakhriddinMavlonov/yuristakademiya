const svc = require('./gamification.service');

async function getStats(req, res, next) {
  try {
    const userId = req.user.id;
    const stats = await svc.getStats(userId);
    res.json(stats);
  } catch (e) {
    next(e);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const { groupId } = req.query;
    const leaderboard = await svc.getLeaderboard(groupId ? parseInt(groupId) : null);
    res.json(leaderboard);
  } catch (e) {
    next(e);
  }
}

async function updateStreak(req, res, next) {
  try {
    const userId = req.user.id;
    const streak = await svc.updateStreak(userId);
    const stats = await svc.getStats(userId);
    res.json(stats);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getStats,
  getLeaderboard,
  updateStreak,
};
