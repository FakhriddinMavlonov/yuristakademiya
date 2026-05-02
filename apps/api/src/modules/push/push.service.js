const webpush = require('web-push');
const { query } = require('../../config/db');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@yuristakademiya.uz';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn('⚠ VAPID keys not set — push notifications disabled');
}

const getPublicKey = () => ({ publicKey: VAPID_PUBLIC || '' });

const subscribe = async (userId, sub, userAgent) => {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { ok: false, error: 'Invalid subscription' };
  }
  await query(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth, user_agent=EXCLUDED.user_agent
  `, [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent || null]);
  return { ok: true };
};

const unsubscribe = async (endpoint) => {
  await query('DELETE FROM push_subscriptions WHERE endpoint=$1', [endpoint]);
  return { ok: true };
};

const sendToUsers = async (userIds, payload) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, failed: 0, skipped: true };
  if (!userIds?.length) return { sent: 0, failed: 0 };
  const { rows: subs } = await query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::int[])',
    [userIds]
  );
  let sent = 0, failed = 0;
  const dead = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.id);
      else console.error('Push send error:', err.statusCode, err.body);
    }
  }));
  if (dead.length) {
    await query('DELETE FROM push_subscriptions WHERE id = ANY($1::int[])', [dead]);
  }
  return { sent, failed };
};

module.exports = { getPublicKey, subscribe, unsubscribe, sendToUsers };
