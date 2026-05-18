/**
 * Kimlik Doğrulama Route'ları (PostgreSQL)
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryOne, execute } = require('../db');
const { authRequired, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Tüm alanlar zorunludur' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Şifre en az 6 karakter olmalıdır' });
    }

    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Bu e-posta zaten kayıtlı' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    await execute("INSERT INTO users (id, email, password, name, plan) VALUES ($1, $2, $3, $4, 'free')",
      [id, email.toLowerCase(), hashedPassword, name]);

    const token = jwt.sign({ id, email: email.toLowerCase(), name, plan: 'free' }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      data: { token, user: { id, email: email.toLowerCase(), name, plan: 'free' } }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Kayıt sırasında hata oluştu' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-posta ve şifre gerekli' });
    }

    const user = await queryOne("SELECT id, email, password, name, plan FROM users WHERE email = $1", [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'E-posta veya şifre hatalı' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'E-posta veya şifre hatalı' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, plan: user.plan }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Giriş sırasında hata oluştu' });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await queryOne("SELECT id, email, name, plan, created_at FROM users WHERE id = $1", [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    const calcCount = await queryOne("SELECT COUNT(*)::int as count FROM calculations WHERE user_id = $1", [user.id]);
    const bulkCount = await queryOne("SELECT COUNT(*)::int as count FROM bulk_analyses WHERE user_id = $1", [user.id]);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, plan: user.plan, created_at: user.created_at },
        stats: { totalCalculations: calcCount?.count || 0, totalBulkAnalyses: bulkCount?.count || 0 }
      }
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ success: false, error: 'Profil yüklenemedi' });
  }
});

module.exports = router;
