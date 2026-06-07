const { query } = require('../config/db');

// In-memory store as fallback; for multi-process use Redis
const memoryStore = new Map();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of memoryStore.entries()) {
    if (now > val.resetAt) memoryStore.delete(key);
  }
}, 60 * 1000);

const rateLimiter = (maxRequests, windowMs) => (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = `${ip}:${req.method}:${req.path}`;
  const now = Date.now();

  let rec = memoryStore.get(key);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + windowMs };
  }
  rec.count++;
  memoryStore.set(key, rec);

  // Set rate limit headers for transparency
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rec.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(rec.resetAt / 1000));

  if (rec.count > maxRequests) {
    return res.status(429).json({ error: 'Juda ko\'p urinish. Biroz kuting.' });
  }
  next();
};

// Higher threshold for general API (not as sensitive as login)
const generalLimiter = rateLimiter(60, 60 * 1000);   // 60 req/min
const strictLimiter  = rateLimiter(10, 15 * 60 * 1000); // 10 req/15min

// Audit log helper — logs admin actions to a table
const DEFAULT_USER = { id: null, role: 'anonymous' };
const logAdminAction = async (req, action, details = {}) => {
  try {
    const user = req.user || DEFAULT_USER;
    await query(
      `INSERT INTO audit_log (user_id, user_role, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.role, action, JSON.stringify(details), req.ip || null, req.headers['user-agent'] || null]
    );
  } catch (e) {
    console.error('[audit] Failed to log action:', e.message);
  }
};

module.exports = { rateLimiter, generalLimiter, strictLimiter, logAdminAction };
