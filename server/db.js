/**
 * PostgreSQL Veritabanı (Supabase uyumlu)
 * Production-ready: Kalıcı bulut veritabanı
 * v2.1 — Ödeme sistemi + indeksler + cascade
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

async function initDb() {
  const client = await pool.connect();
  try {
    // ── Kullanıcılar ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        plan_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Hesaplamalar ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform_id TEXT NOT NULL,
        platform_name TEXT,
        category_id TEXT NOT NULL,
        category_name TEXT,
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        net_profit REAL,
        profit_margin REAL,
        total_profit REAL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Toplu Analizler ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS bulk_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name TEXT,
        total_products INTEGER,
        profitable_count INTEGER,
        loss_count INTEGER,
        total_profit REAL,
        results_json TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Ödemeler ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'TRY',
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        plan_type TEXT NOT NULL,
        plan_duration_days INTEGER DEFAULT 30,
        card_last4 TEXT,
        card_holder TEXT,
        transaction_ref TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);

    // ── Abonelikler ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT DEFAULT 'free',
        status TEXT DEFAULT 'active',
        payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
        starts_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        auto_renew BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Performans İndeksleri ──
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON calculations(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON calculations(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bulk_analyses_user_id ON bulk_analyses(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at)`);

    // ── Mevcut tablolara yeni sütun ekle (varsa atla) ──
    await safeAddColumn(client, 'users', 'plan_expires_at', 'TIMESTAMPTZ');

    console.log('✅ PostgreSQL tabloları ve indeksler hazır');
  } finally {
    client.release();
  }
}

// Sütun yoksa ekle, varsa sessizce geç
async function safeAddColumn(client, table, column, type) {
  try {
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (check.rows.length === 0) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`  ➕ ${table}.${column} sütunu eklendi`);
    }
  } catch (e) {
    // Zaten varsa veya tablo henüz yoksa sessizce geç
  }
}

// Yardımcı: tek satır çek
async function queryOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

// Yardımcı: çoklu satır çek
async function queryAll(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// Yardımcı: insert/update/delete
async function execute(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

module.exports = { pool, initDb, queryOne, queryAll, execute };
