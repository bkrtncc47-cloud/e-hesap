/* Auth & Dashboard — Ücretsiz Versiyon */
const API = '';
let currentUser = null;

function getToken() { return localStorage.getItem('kh_token'); }
function setToken(t) { localStorage.setItem('kh_token', t); }
function clearToken() { localStorage.removeItem('kh_token'); }
function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function checkAuth() {
  const t = getToken();
  if (!t) { updateUI(null); return; }
  try {
    const r = await fetch(`${API}/api/auth/me`, { headers: authHeaders() });
    const d = await r.json();
    if (d.success) { currentUser = d.data.user; updateUI(currentUser); }
    else { clearToken(); updateUI(null); }
  } catch { clearToken(); updateUI(null); }
}

function updateUI(user) {
  const ab = document.getElementById('authButtons');
  const um = document.getElementById('userMenu');
  const ub = document.getElementById('userBadge');
  const nd = document.getElementById('navDashboard');
  const pd = document.getElementById('proDashboard');
  const sb = document.getElementById('saveCalcBtn');

  if (user) {
    ab.style.display = 'none';
    um.style.display = 'flex';
    ub.textContent = user.name;
    if (sb) sb.style.display = 'block';
    nd.style.display = 'inline';
    nd.onclick = (e) => { e.preventDefault(); pd.style.display = 'block'; pd.scrollIntoView({behavior:'smooth'}); loadDashboard(); };
  } else {
    ab.style.display = 'flex';
    um.style.display = 'none';
    nd.style.display = 'none';
    if (pd) pd.style.display = 'none';
    if (sb) sb.style.display = 'none';
  }
}

function showAuthModal(type) {
  const m = document.getElementById('authModal');
  const c = document.getElementById('authModalContent');
  m.style.display = 'flex';
  if (type === 'login') {
    c.innerHTML = `<h2 class="modal-title">👋 Giriş Yap</h2>
      <p class="modal-subtitle">Hesabınıza giriş yapın</p>
      <div class="form-error" id="authError"></div>
      <div class="form-group"><label>E-posta</label><input type="email" id="authEmail" placeholder="ornek@mail.com"></div>
      <div class="form-group"><label>Şifre</label><input type="password" id="authPassword" placeholder="••••••"></div>
      <button class="btn-primary full" onclick="handleLogin()">Giriş Yap</button>
      <div class="modal-footer">Hesabınız yok mu? <a onclick="showAuthModal('register')">Kaydol</a></div>`;
  } else {
    c.innerHTML = `<h2 class="modal-title">🚀 Ücretsiz Kaydol</h2>
      <p class="modal-subtitle">Tüm özellikler sınırsız ve ücretsiz!</p>
      <div class="form-error" id="authError"></div>
      <div class="form-group"><label>Ad Soyad</label><input type="text" id="authName" placeholder="Ad Soyad"></div>
      <div class="form-group"><label>E-posta</label><input type="email" id="authEmail" placeholder="ornek@mail.com"></div>
      <div class="form-group"><label>Şifre</label><input type="password" id="authPassword" placeholder="En az 6 karakter"></div>
      <button class="btn-primary full" onclick="handleRegister()">Kaydol</button>
      <div class="modal-footer">Zaten hesabınız var mı? <a onclick="showAuthModal('login')">Giriş Yap</a></div>`;
  }
}

function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

function showAuthError(msg) {
  const e = document.getElementById('authError');
  if (e) { e.textContent = msg; e.style.display = 'block'; }
}

async function handleLogin() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  if (!email || !password) { showAuthError('Tüm alanları doldurun'); return; }
  try {
    const r = await fetch(`${API}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
    const d = await r.json();
    if (d.success) { setToken(d.data.token); currentUser = d.data.user; updateUI(currentUser); closeAuthModal(); }
    else showAuthError(d.error);
  } catch { showAuthError('Bağlantı hatası'); }
}

async function handleRegister() {
  const name = document.getElementById('authName').value;
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  if (!name || !email || !password) { showAuthError('Tüm alanları doldurun'); return; }
  try {
    const r = await fetch(`${API}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,password}) });
    const d = await r.json();
    if (d.success) { setToken(d.data.token); currentUser = d.data.user; updateUI(currentUser); closeAuthModal(); }
    else showAuthError(d.error);
  } catch { showAuthError('Bağlantı hatası'); }
}

function logout() { clearToken(); currentUser = null; updateUI(null); location.reload(); }

async function saveCalculation() {
  if (!currentUser || !window._lastResult) return;
  const d = window._lastResult;
  try {
    await fetch(`${API}/api/dashboard/save`, {
      method:'POST', headers: authHeaders(),
      body: JSON.stringify({ platformId:d.platform.id, platformName:d.platform.name, categoryId:d.category.id, categoryName:d.category.name, costPrice:d.input.costPrice, sellingPrice:d.input.sellingPrice, quantity:d.input.quantity, netProfit:d.results.netProfit, profitMargin:d.results.profitMargin, totalProfit:d.results.totalProfit })
    });
    const btn = document.getElementById('saveCalcBtn');
    btn.textContent = '✅ Kaydedildi!';
    setTimeout(() => { btn.textContent = '💾 Hesaplamayı Kaydet'; }, 2000);
  } catch { alert('Kaydetme başarısız'); }
}

async function loadDashboard() { loadStats(); loadHistory(); }

async function loadStats() {
  try {
    const r = await fetch(`${API}/api/dashboard/stats`, { headers: authHeaders() });
    const d = await r.json();
    if (d.success) {
      const s = d.data;
      document.getElementById('dashboardStats').innerHTML = `
        <div class="dash-stat"><div class="val">${s.totalCalculations}</div><div class="lbl">Toplam Hesaplama</div></div>
        <div class="dash-stat"><div class="val" style="color:var(--green)">${s.profitableProducts}</div><div class="lbl">Kârlı Ürün</div></div>
        <div class="dash-stat"><div class="val">${s.totalProfit.toFixed(2)} ₺</div><div class="lbl">Toplam Kâr</div></div>
        <div class="dash-stat"><div class="val">%${s.avgProfitMargin.toFixed(1)}</div><div class="lbl">Ort. Kâr Marjı</div></div>
        <div class="dash-stat"><div class="val">${s.topPlatform}</div><div class="lbl">En Çok Platform</div></div>`;
    }
  } catch {}
}

async function loadHistory() {
  try {
    const r = await fetch(`${API}/api/dashboard/history`, { headers: authHeaders() });
    const d = await r.json();
    const el = document.getElementById('historyList');
    if (!d.success || !d.data.calculations || d.data.calculations.length === 0) {
      el.innerHTML = '<div class="history-empty">📭 Henüz hesaplama geçmişi yok.</div>';
      return;
    }
    el.innerHTML = `<table class="history-table"><thead><tr><th>Tarih</th><th>Platform</th><th>Kategori</th><th>Maliyet</th><th>Fiyat</th><th>Adet</th><th>Kâr</th><th>Marj</th><th>Sil</th></tr></thead><tbody>` +
      d.data.calculations.map(c => `<tr id="row-${c.id}">
        <td>${new Date(c.createdAt).toLocaleDateString('tr')}</td>
        <td>${c.platformName}</td><td>${c.categoryName}</td>
        <td>${c.costPrice}₺</td><td>${c.sellingPrice}₺</td><td>${c.quantity}</td>
        <td style="color:${c.netProfit>=0?'var(--green)':'var(--red)'}">${c.netProfit}₺</td>
        <td>%${c.profitMargin}</td>
        <td><button class="btn-delete-row" onclick="deleteSingleHistory('${c.id}')">🗑️</button></td>
      </tr>`).join('') + `</tbody></table>`;
  } catch { document.getElementById('historyList').innerHTML = '<div class="history-empty">Yüklenemedi</div>'; }
}

async function deleteSingleHistory(id) {
  showConfirm('🗑️ Kaydı Sil', 'Bu kaydı silmek istediğinize emin misiniz?', async () => {
    try {
      const r = await fetch(`${API}/api/dashboard/history/${id}`, { method:'DELETE', headers:authHeaders() });
      const d = await r.json();
      if (d.success) {
        const row = document.getElementById(`row-${id}`);
        if (row) { row.style.opacity='0'; setTimeout(()=>{row.remove();loadStats();},300); }
      }
    } catch { alert('Silme hatası'); }
  });
}

async function deleteAllHistory() {
  showConfirm('⚠️ Tüm Geçmişi Sil', 'Tüm geçmişiniz kalıcı olarak silinecek!', async () => {
    try {
      const r = await fetch(`${API}/api/dashboard/history/all`, { method:'DELETE', headers:authHeaders() });
      const d = await r.json();
      if (d.success) loadDashboard();
    } catch { alert('Silme hatası'); }
  });
}

function showConfirm(title, message, onConfirm) {
  const existing = document.querySelector('.confirm-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `<div class="confirm-box"><h3>${title}</h3><p>${message}</p><div class="confirm-actions"><button class="btn-cancel" id="confirmCancel">İptal</button><button class="btn-confirm-delete" id="confirmDelete">Sil</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('confirmCancel').onclick = () => overlay.remove();
  document.getElementById('confirmDelete').onclick = () => { overlay.remove(); onConfirm(); };
}

document.addEventListener('DOMContentLoaded', () => { checkAuth(); });
