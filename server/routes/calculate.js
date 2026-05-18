const express = require('express');
const router = express.Router();
const platforms = require('../data/platforms');

function calculateProfit(platform, categoryId, costPrice, sellingPrice, quantity = 1) {
  const category = platform.categories.find(c => c.id === categoryId);
  if (!category) return null;
  const commissionAmount = sellingPrice * category.commissionRate;
  const commissionWithKDV = commissionAmount * (1 + platform.kdvRate);
  const shippingCost = platform.baseShippingCost;
  const serviceFee = platform.serviceFee;
  const serviceFeeWithKDV = serviceFee * (1 + platform.kdvRate);
  const paymentFee = sellingPrice * platform.paymentProcessingFee;
  const totalDeductions = commissionWithKDV + shippingCost + serviceFeeWithKDV + paymentFee;
  const netRevenue = sellingPrice - totalDeductions;
  const netProfit = netRevenue - costPrice;
  const totalProfit = netProfit * quantity;
  const profitMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const roi = costPrice > 0 ? (netProfit / costPrice) * 100 : 0;
  return {
    platform: { id: platform.id, name: platform.name, logo: platform.logo, color: platform.color, colorLight: platform.colorLight },
    category: { id: category.id, name: category.name, commissionRate: category.commissionRate },
    input: { costPrice, sellingPrice, quantity },
    breakdown: {
      commissionAmount: round(commissionAmount), commissionWithKDV: round(commissionWithKDV),
      commissionRate: (category.commissionRate * 100).toFixed(1), shippingCost: round(shippingCost),
      serviceFee: round(serviceFee), serviceFeeWithKDV: round(serviceFeeWithKDV),
      paymentFee: round(paymentFee), totalDeductions: round(totalDeductions),
    },
    results: {
      netRevenue: round(netRevenue), netProfit: round(netProfit), totalProfit: round(totalProfit),
      profitMargin: round(profitMargin), roi: round(roi), isProfitable: netProfit > 0,
    },
    recommendations: {
      breakEvenPrice: round(calculateBreakEvenPrice(platform, category, costPrice)),
      minProfitPrice: round(calculateMinProfitPrice(platform, category, costPrice, 0.10)),
      goodProfitPrice: round(calculateMinProfitPrice(platform, category, costPrice, 0.20)),
    }
  };
}

function calculateBreakEvenPrice(platform, category, costPrice) {
  const factor = 1 - (category.commissionRate * (1 + platform.kdvRate)) - platform.paymentProcessingFee;
  const fixedCosts = platform.baseShippingCost + (platform.serviceFee * (1 + platform.kdvRate));
  return (costPrice + fixedCosts) / factor;
}

function calculateMinProfitPrice(platform, category, costPrice, targetMargin) {
  const factor = 1 - (category.commissionRate * (1 + platform.kdvRate)) - platform.paymentProcessingFee - targetMargin;
  const fixedCosts = platform.baseShippingCost + (platform.serviceFee * (1 + platform.kdvRate));
  return (costPrice + fixedCosts) / factor;
}

function round(num) { return Math.round(num * 100) / 100; }

router.post('/', (req, res) => {
  const { platformId, categoryId, costPrice, sellingPrice, quantity } = req.body;
  if (!platformId || !categoryId || costPrice === undefined || sellingPrice === undefined) {
    return res.status(400).json({ success: false, error: 'Eksik parametreler' });
  }
  const platform = platforms.find(p => p.id === platformId);
  if (!platform) return res.status(404).json({ success: false, error: 'Platform bulunamadı' });
  const result = calculateProfit(platform, categoryId, Number(costPrice), Number(sellingPrice), Number(quantity) || 1);
  if (!result) return res.status(404).json({ success: false, error: 'Kategori bulunamadı' });
  res.json({ success: true, data: result });
});

router.post('/compare', (req, res) => {
  const { categoryId, costPrice, sellingPrice, quantity } = req.body;
  if (!categoryId || costPrice === undefined || sellingPrice === undefined) {
    return res.status(400).json({ success: false, error: 'Eksik parametreler' });
  }
  const results = platforms
    .map(platform => calculateProfit(platform, categoryId, Number(costPrice), Number(sellingPrice), Number(quantity) || 1))
    .filter(Boolean)
    .sort((a, b) => b.results.netProfit - a.results.netProfit);
  const bestPlatform = results.length > 0 ? results[0] : null;
  res.json({
    success: true,
    data: {
      results,
      bestPlatform: bestPlatform ? { name: bestPlatform.platform.name, profit: bestPlatform.results.netProfit, margin: bestPlatform.results.profitMargin } : null,
      totalPlatforms: results.length,
    }
  });
});

router.post('/bulk', (req, res) => {
  const { products } = req.body;
  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ success: false, error: 'products dizisi gerekli' });
  }
  const results = products.map(product => {
    const { platformId, categoryId, costPrice, sellingPrice, quantity, productName } = product;
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return { productName, error: 'Platform bulunamadı' };
    const result = calculateProfit(platform, categoryId, Number(costPrice), Number(sellingPrice), Number(quantity) || 1);
    if (!result) return { productName, error: 'Kategori bulunamadı' };
    return { productName, ...result };
  });
  const totalProfit = results.filter(r => r.results).reduce((sum, r) => sum + r.results.totalProfit, 0);
  res.json({ success: true, data: { results, summary: { totalProducts: results.length, totalProfit: round(totalProfit) } } });
});

module.exports = router;
