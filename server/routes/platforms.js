const express = require('express');
const router = express.Router();
const platforms = require('../data/platforms');

// GET /api/platforms - Tüm platformları listele
router.get('/', (req, res) => {
  const summary = platforms.map(p => ({
    id: p.id,
    name: p.name,
    logo: p.logo,
    color: p.color,
    colorLight: p.colorLight,
    description: p.description,
    baseShippingCost: p.baseShippingCost,
    serviceFee: p.serviceFee,
    categoryCount: p.categories.length
  }));
  res.json({ success: true, data: summary });
});

// GET /api/platforms/:id - Tek platform detayı
router.get('/:id', (req, res) => {
  const platform = platforms.find(p => p.id === req.params.id);
  if (!platform) {
    return res.status(404).json({ success: false, error: 'Platform bulunamadı' });
  }
  res.json({ success: true, data: platform });
});

// GET /api/platforms/:id/categories - Platform kategorileri
router.get('/:id/categories', (req, res) => {
  const platform = platforms.find(p => p.id === req.params.id);
  if (!platform) {
    return res.status(404).json({ success: false, error: 'Platform bulunamadı' });
  }
  res.json({ success: true, data: platform.categories });
});

module.exports = router;
