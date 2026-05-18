/**
 * JWT Authentication Middleware (Production)
 */
const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'e-hesap-super-secret-key-2026';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Giriş yapmanız gerekiyor' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Oturum süresi dolmuş, tekrar giriş yapın' });
  }
}

function authOptional(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

async function proRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Giriş yapmanız gerekiyor' });
  }
  const row = await queryOne("SELECT plan, plan_expires_at FROM users WHERE id = $1", [req.user.id]);
  if (!row) {
    return res.status(403).json({ success: false, error: 'Kullanıcı bulunamadı' });
  }

  if (row.plan === 'pro') {
    if (row.plan_expires_at && new Date(row.plan_expires_at) < new Date()) {
      const { execute } = require('../db');
      try {
        await execute("UPDATE users SET plan = 'free', updated_at = NOW() WHERE id = $1", [req.user.id]);
        await execute("UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1", [req.user.id]);
      } catch (err) {
        console.error('Subscription auto-expiration check failed:', err);
      }
      return res.status(403).json({ success: false, error: 'Pro üyelik süreniz dolmuştur.', requiresPro: true });
    }
    return next();
  }

  return res.status(403).json({ success: false, error: 'Bu özellik Pro üyelik gerektirir', requiresPro: true });
}

module.exports = { authRequired, authOptional, proRequired, JWT_SECRET };
