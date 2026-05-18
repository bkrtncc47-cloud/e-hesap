require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { initDb } = require('./db');

const platformRoutes = require('./routes/platforms');
const calculateRoutes = require('./routes/calculate');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const bulkRoutes = require('./routes/bulk');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/platforms', platformRoutes);
app.use('/api/calculate', calculateRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'postgresql' });
});

// Legal pages
app.get('/gizlilik-politikasi', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'gizlilik-politikasi.html'));
});
app.get('/kullanim-kosullari', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'kullanim-kosullari.html'));
});
app.get('/cerez-politikasi', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'cerez-politikasi.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, error: 'Sunucu hatası' });
});

// Initialize DB then start server
(async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`
  ╔═══════════════════════════════════════════╗
  ║   📊 E-Hesap v3.0 — Ücretsiz             ║
  ║   📡 Port: ${PORT}                          ║
  ║   🌐 http://localhost:${PORT}               ║
  ║   💾 PostgreSQL (Supabase): Aktif        ║
  ║   🔒 JWT Auth: Aktif                     ║
  ╚═══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Sunucu başlatılamadı:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
