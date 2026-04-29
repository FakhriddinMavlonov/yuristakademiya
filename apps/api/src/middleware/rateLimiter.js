const store = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);

const rateLimiter = (maxRequests, windowMs) => (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = `${ip}:${req.method}:${req.path}`;
  const now = Date.now();

  const rec = store.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count++;
  store.set(key, rec);

  if (rec.count > maxRequests) {
    return res.status(429).json({ error: 'Juda ko\'p urinish. Biroz kuting.' });
  }
  next();
};

module.exports = { rateLimiter };
