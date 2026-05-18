/**
 * Toplu Excel Analiz Route'u (PostgreSQL)
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { execute } = require('../db');
const platforms = require('../data/platforms');
const { authRequired, proRequired } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Sadece Excel veya CSV dosyaları yüklenebilir'));
  }
});

function calculateProfit(platform, categoryId, costPrice, sellingPrice) {
  const category = platform.categories.find(c => c.id === categoryId);
  if (!category) return null;
  const commissionWithKDV = sellingPrice * category.commissionRate * (1 + platform.kdvRate);
  const serviceFeeWithKDV = platform.serviceFee * (1 + platform.kdvRate);
  const paymentFee = sellingPrice * platform.paymentProcessingFee;
  const totalDeductions = commissionWithKDV + platform.baseShippingCost + serviceFeeWithKDV + paymentFee;
  const netProfit = sellingPrice - totalDeductions - costPrice;
  const profitMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  return {
    commissionWithKDV: Math.round(commissionWithKDV * 100) / 100,
    shippingCost: platform.baseShippingCost,
    serviceFeeWithKDV: Math.round(serviceFeeWithKDV * 100) / 100,
    paymentFee: Math.round(paymentFee * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    isProfitable: netProfit > 0
  };
}

router.post('/upload', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
    const platformId = req.body.platformId || 'trendyol';
    const categoryId = req.body.categoryId || 'fashion';
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return res.status(400).json({ success: false, error: 'Platform bulunamadı' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (data.length === 0) return res.status(400).json({ success: false, error: 'Dosyada veri bulunamadı' });
    const results = data.map((row, i) => {
      const productName = row['Ürün Adı'] || row['urun_adi'] || row['product'] || row['name'] || `Ürün ${i + 1}`;
      const costPrice = parseFloat(row['Maliyet'] || row['maliyet'] || row['cost'] || 0);
      const sellingPrice = parseFloat(row['Satış Fiyatı'] || row['satis_fiyati'] || row['price'] || row['fiyat'] || 0);
      const cat = row['Kategori'] || row['kategori'] || row['category'] || categoryId;
      let catId = categoryId;
      const foundCat = platform.categories.find(c => c.name.toLowerCase().includes(String(cat).toLowerCase()) || c.id === cat);
      if (foundCat) catId = foundCat.id;
      if (!costPrice || !sellingPrice) return { productName, error: 'Maliyet veya fiyat eksik', costPrice, sellingPrice };
      const calc = calculateProfit(platform, catId, costPrice, sellingPrice);
      return { productName, costPrice, sellingPrice, categoryId: catId, ...calc };
    });
    const profitable = results.filter(r => r.isProfitable === true);
    const lossMaking = results.filter(r => r.isProfitable === false);
    const totalProfit = results.filter(r => r.netProfit != null).reduce((s, r) => s + r.netProfit, 0);
    const analysisId = uuidv4();
    await execute(
      `INSERT INTO bulk_analyses (id, user_id, file_name, total_products, profitable_count, loss_count, total_profit, results_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [analysisId, req.user.id, req.file.originalname, results.length, profitable.length, lossMaking.length, Math.round(totalProfit * 100) / 100, JSON.stringify(results)]
    );
    res.json({
      success: true,
      data: {
        id: analysisId,
        platform: { id: platform.id, name: platform.name },
        summary: {
          totalProducts: results.length, profitableCount: profitable.length,
          lossCount: lossMaking.length, totalProfit: Math.round(totalProfit * 100) / 100,
          avgProfit: results.length > 0 ? Math.round(totalProfit / results.length * 100) / 100 : 0,
        },
        products: results.sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0)),
      }
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ success: false, error: 'Dosya analiz edilirken hata oluştu' });
  }
});

router.get('/template', (req, res) => {
  const templateData = [
    { 'Ürün Adı': 'Örnek Tişört', 'Maliyet': 45, 'Satış Fiyatı': 149.90, 'Kategori': 'Moda & Giyim' },
    { 'Ürün Adı': 'Spor Ayakkabı', 'Maliyet': 120, 'Satış Fiyatı': 399.90, 'Kategori': 'Ayakkabı' },
    { 'Ürün Adı': 'Telefon Kılıfı', 'Maliyet': 8, 'Satış Fiyatı': 79.90, 'Kategori': 'Elektronik' },
    { 'Ürün Adı': 'Yüz Bakım Seti', 'Maliyet': 35, 'Satış Fiyatı': 189.90, 'Kategori': 'Kozmetik & Kişisel Bakım' },
    { 'Ürün Adı': 'Yastık Kılıfı Set', 'Maliyet': 20, 'Satış Fiyatı': 99.90, 'Kategori': 'Ev & Yaşam' },
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ürünler');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=e-hesap-sablon.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
