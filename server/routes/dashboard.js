/**
 * Dashboard Route'ları (PostgreSQL)
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, execute } = require('../db');
const { authRequired } = require('../middleware/auth');

router.post('/save', authRequired, async (req, res) => {
  try {
    const { platformId, platformName, categoryId, categoryName, costPrice, sellingPrice, quantity, netProfit, profitMargin, totalProfit } = req.body;
    const id = uuidv4();
    await execute(
      `INSERT INTO calculations (id, user_id, platform_id, platform_name, category_id, category_name, cost_price, selling_price, quantity, net_profit, profit_margin, total_profit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, req.user.id, platformId, platformName, categoryId, categoryName, costPrice, sellingPrice, quantity || 1, netProfit, profitMargin, totalProfit]
    );
    res.json({ success: true, data: { id, message: 'Hesaplama kaydedildi' } });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ success: false, error: 'Kaydetme başarısız' });
  }
});

router.get('/history', authRequired, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const countRow = await queryOne("SELECT COUNT(*)::int as total FROM calculations WHERE user_id = $1", [req.user.id]);
    const total = countRow?.total || 0;
    const rows = await queryAll(
      "SELECT id, platform_id, platform_name, category_id, category_name, cost_price, selling_price, quantity, net_profit, profit_margin, total_profit, created_at FROM calculations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [req.user.id, limit, offset]
    );
    const calculations = rows.map(r => ({
      id: r.id, platformId: r.platform_id, platformName: r.platform_name, categoryId: r.category_id,
      categoryName: r.category_name, costPrice: r.cost_price, sellingPrice: r.selling_price,
      quantity: r.quantity, netProfit: r.net_profit, profitMargin: r.profit_margin,
      totalProfit: r.total_profit, createdAt: r.created_at
    }));
    res.json({ success: true, data: { calculations, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, error: 'Geçmiş yüklenemedi' });
  }
});

router.get('/stats', authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const totalCalc = await queryOne("SELECT COUNT(*)::int as c FROM calculations WHERE user_id = $1", [uid]);
    const profitable = await queryOne("SELECT COUNT(*)::int as c FROM calculations WHERE user_id = $1 AND net_profit > 0", [uid]);
    const totalProfit = await queryOne("SELECT COALESCE(SUM(total_profit), 0) as s FROM calculations WHERE user_id = $1", [uid]);
    const avgMargin = await queryOne("SELECT COALESCE(AVG(profit_margin), 0) as a FROM calculations WHERE user_id = $1", [uid]);
    const topPlatform = await queryOne("SELECT platform_name FROM calculations WHERE user_id = $1 GROUP BY platform_name ORDER BY COUNT(*) DESC LIMIT 1", [uid]);
    res.json({
      success: true,
      data: {
        totalCalculations: totalCalc?.c || 0,
        profitableProducts: profitable?.c || 0,
        totalProfit: Math.round((parseFloat(totalProfit?.s) || 0) * 100) / 100,
        avgProfitMargin: Math.round((parseFloat(avgMargin?.a) || 0) * 100) / 100,
        topPlatform: topPlatform?.platform_name || '-',
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: 'İstatistikler yüklenemedi' });
  }
});

router.delete('/history/all', authRequired, async (req, res) => {
  try {
    const result = await execute("DELETE FROM calculations WHERE user_id = $1", [req.user.id]);
    res.json({ success: true, data: { deleted: result.rowCount, message: 'Tüm geçmiş silindi' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Toplu silme başarısız' });
  }
});

router.delete('/history/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await execute("DELETE FROM calculations WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Kayıt bulunamadı' });
    res.json({ success: true, data: { message: 'Kayıt silindi' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Silme başarısız' });
  }
});

module.exports = router;
