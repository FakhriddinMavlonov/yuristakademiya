const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, email, role, first_name, last_name FROM users WHERE id=$1 AND is_active=true', [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { auth, requireRole };
