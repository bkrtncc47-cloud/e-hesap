/**
 * Ödeme Route'ları (Production-Ready)
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { queryOne, queryAll, execute } = require('../db');
const { authRequired, JWT_SECRET } = require('../middleware/auth');

const PLANS = {
  monthly: { id: 'monthly', name: 'Aylık Pro', price: 0, durationDays: 30, badge: '🔥 Ücretsiz', features: ['Toplu Excel Analizi', 'Sınırsız Hesaplama Geçmişi', 'Detaylı İstatistikler'] },
};

router.get('/plans', (req, res) => {
  const plans = Object.values(PLANS).map(p => ({
    id: p.id, name: p.name, price: p.price, durationDays: p.durationDays,
    badge: p.badge, features: p.features,
  }));
  res.json({ success: true, data: plans });
});

router.get('/subscription', authRequired, async (req, res) => {
  try {
    res.json({ success: true, data: { plan: 'free', status: 'active', expiresAt: null, daysLeft: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Abonelik bilgisi yüklenemedi' });
  }
});

module.exports = router;
