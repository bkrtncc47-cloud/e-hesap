/* E-Hesap — Ana Uygulama */
let platformsData = [];

document.addEventListener('DOMContentLoaded', () => {
  loadPlatforms();
  setupEvents();
});

async function loadPlatforms() {
  const r = await fetch('/api/platforms');
  const d = await r.json();
  platformsData = d.data;
  const sel = document.getElementById('platformSelect');
  sel.innerHTML = '<option value="">Platform seçin...</option>';
  platformsData.forEach(p => { sel.innerHTML += `<option value="${p.id}">${p.logo} ${p.name}</option>`; });
  const bp = document.getElementById('bulkPlatform');
  if (bp) { bp.innerHTML = ''; platformsData.forEach(p => { bp.innerHTML += `<option value="${p.id}">${p.logo} ${p.name}</option>`; }); }
  const bc = document.getElementById('bulkCategory');
  if (bc) { bc.innerHTML = '<option value="fashion">Moda & Giyim</option><option value="electronics">Elektronik</option><option value="shoes">Ayakkabı</option><option value="cosmetics">Kozmetik</option><option value="home">Ev & Yaşam</option><option value="sports">Spor</option>'; }
  renderPlatformsGrid();
}

function setupEvents() {
  const ps = document.getElementById('platformSelect');
  const cs = document.getElementById('categorySelect');
  ps.addEventListener('change', async (e) => {
    if (!e.target.value) { cs.disabled = true; cs.innerHTML = '<option value="">Önce platform seçin...</option>'; return; }
    const r = await fetch(`/api/platforms/${e.target.value}/categories`);
    const d = await r.json();
    cs.disabled = false;
    cs.innerHTML = '<option value="">Kategori seçin...</option>';
    d.data.forEach(c => { cs.innerHTML += `<option value="${c.id}">${c.name} (${(c.commissionRate*100).toFixed(0)}%)</option>`; });
    validateForm();
  });
  cs.addEventListener('change', validateForm);
  document.getElementById('costPrice').addEventListener('input', validateForm);
  document.getElementById('sellingPrice').addEventListener('input', validateForm);
  document.getElementById('calculateBtn').addEventListener('click', handleCalculate);
  document.getElementById('compareBtn').addEventListener('click', handleCompare);
  const zone = document.getElementById('fileUploadZone');
  const fileInput = document.getElementById('fileInput');
  if (zone && fileInput) {
    zone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (f) {
        document.getElementById('uploadFilename').textContent = `📄 ${f.name}`;
        document.getElementById('bulkAnalyzeBtn').disabled = false;
      }
    });
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); const t = document.querySelector(a.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth'}); });
  });
}

function validateForm() {
  const ok = document.getElementById('platformSelect').value && document.getElementById('categorySelect').value && document.getElementById('costPrice').value && document.getElementById('sellingPrice').value;
  document.getElementById('calculateBtn').disabled = !ok;
}

async function handleCalculate() {
  const btn = document.getElementById('calculateBtn');
  btn.innerHTML = '<span class="loading-spinner"></span>'; btn.disabled = true;
  const body = { platformId: document.getElementById('platformSelect').value, categoryId: document.getElementById('categorySelect').value, costPrice: parseFloat(document.getElementById('costPrice').value), sellingPrice: parseFloat(document.getElementById('sellingPrice').value), quantity: parseInt(document.getElementById('quantity').value) || 1 };
  const r = await fetch('/api/calculate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const resp = await r.json();
  window._lastResult = resp.data;
  renderResults(resp.data);
  btn.innerHTML = '⚡ Hesapla'; btn.disabled = false;
}

function renderResults(d) {
  const p = document.getElementById('resultsPanel');
  p.style.display = 'block';
  const ok = d.results.isProfitable;
  document.getElementById('resultPlatformHeader').innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:14px;border-radius:8px;background:rgba(255,255,255,0.03);margin-bottom:16px"><span style="font-size:1.8rem">${d.platform.logo}</span><div><div style="font-weight:600">${d.platform.name}</div><div style="font-size:0.82rem;color:var(--text-dim)">${d.category.name} • %${d.breakdown.commissionRate}</div></div></div>`;
  document.getElementById('profitDisplay').innerHTML = `<div class="profit-box ${ok?'ok':'bad'}"><div class="profit-label">${ok?'🎉 Net Kâr':'⚠️ Zarar'} (Adet Başı)</div><div class="profit-amount ${ok?'positive':'negative'}">${ok?'+':''}${d.results.netProfit.toFixed(2)} ₺</div><div class="profit-meta"><div class="profit-meta-item"><span class="profit-meta-value" style="color:${ok?'var(--green)':'var(--red)'}">${d.results.profitMargin.toFixed(1)}%</span><span class="profit-meta-label">Kâr Marjı</span></div><div class="profit-meta-item"><span class="profit-meta-value" style="color:var(--accent-light)">${d.results.roi.toFixed(1)}%</span><span class="profit-meta-label">ROI</span></div><div class="profit-meta-item"><span class="profit-meta-value" style="color:${ok?'var(--green)':'var(--red)'}">${d.results.totalProfit.toFixed(2)} ₺</span><span class="profit-meta-label">Aylık (${d.input.quantity} adet)</span></div></div></div>`;
  document.getElementById('breakdownList').innerHTML = `<div class="bd-item"><span class="bd-label">Satış Fiyatı</span><span class="bd-val">${d.input.sellingPrice.toFixed(2)} ₺</span></div><div class="bd-item"><span class="bd-label">Ürün Maliyeti</span><span class="bd-val neg">-${d.input.costPrice.toFixed(2)} ₺</span></div><div class="bd-item"><span class="bd-label">Komisyon (%${d.breakdown.commissionRate}+KDV)</span><span class="bd-val neg">-${d.breakdown.commissionWithKDV.toFixed(2)} ₺</span></div><div class="bd-item"><span class="bd-label">Kargo</span><span class="bd-val neg">-${d.breakdown.shippingCost.toFixed(2)} ₺</span></div><div class="bd-item"><span class="bd-label">Hizmet Bedeli+KDV</span><span class="bd-val neg">-${d.breakdown.serviceFeeWithKDV.toFixed(2)} ₺</span></div><div class="bd-item"><span class="bd-label">Ödeme Ücreti</span><span class="bd-val neg">-${d.breakdown.paymentFee.toFixed(2)} ₺</span></div><div class="bd-item" style="border-top:2px solid var(--card-border);padding-top:12px;margin-top:4px"><span class="bd-label" style="font-weight:600;color:var(--text)">Toplam Kesinti</span><span class="bd-val neg" style="font-size:1.05rem">-${d.breakdown.totalDeductions.toFixed(2)} ₺</span></div>`;
  document.getElementById('recommendationsSection').innerHTML = `<div class="recs"><h4>💡 Fiyat Önerileri</h4><div class="rec-row"><span>Başabaş Fiyatı</span><span class="val">${d.recommendations.breakEvenPrice.toFixed(2)} ₺</span></div><div class="rec-row"><span>Min. Kârlı (%10)</span><span class="val">${d.recommendations.minProfitPrice.toFixed(2)} ₺</span></div><div class="rec-row"><span>İyi Kâr (%20)</span><span class="val">${d.recommendations.goodProfitPrice.toFixed(2)} ₺</span></div></div>`;
  const t=d.input.sellingPrice, cp=(d.input.costPrice/t*100).toFixed(1), cm=(d.breakdown.commissionWithKDV/t*100).toFixed(1), sh=(d.breakdown.shippingCost/t*100).toFixed(1), sv=(d.breakdown.serviceFeeWithKDV/t*100).toFixed(1), pr=Math.max(0,d.results.netProfit/t*100).toFixed(1);
  document.getElementById('visualBarSection').innerHTML = `<div class="vbar-section"><div class="vbar-title">Fiyat Dağılımı</div><div class="vbar"><div class="vbar-seg" style="width:${cp}%;background:#ff6b6b">${cp>8?cp+'%':''}</div><div class="vbar-seg" style="width:${cm}%;background:#fdcb6e">${cm>8?cm+'%':''}</div><div class="vbar-seg" style="width:${sh}%;background:#74b9ff">${sh>8?sh+'%':''}</div><div class="vbar-seg" style="width:${sv}%;background:#a29bfe">${sv>8?sv+'%':''}</div><div class="vbar-seg" style="width:${pr}%;background:#00cec9">${pr>8?pr+'%':''}</div></div><div class="bar-legend"><div class="bar-legend-item"><span class="bar-legend-dot" style="background:#ff6b6b"></span>Maliyet</div><div class="bar-legend-item"><span class="bar-legend-dot" style="background:#fdcb6e"></span>Komisyon</div><div class="bar-legend-item"><span class="bar-legend-dot" style="background:#74b9ff"></span>Kargo</div><div class="bar-legend-item"><span class="bar-legend-dot" style="background:#a29bfe"></span>Hizmet</div><div class="bar-legend-item"><span class="bar-legend-dot" style="background:#00cec9"></span>Kâr</div></div></div>`;
  p.scrollIntoView({behavior:'smooth'});
}

async function handleCompare() {
  const cat = document.getElementById('compareCat').value;
  const cost = parseFloat(document.getElementById('compareCost').value);
  const price = parseFloat(document.getElementById('comparePrice').value);
  if (!cat||!cost||!price) { alert('Tüm alanları doldurun'); return; }
  const btn = document.getElementById('compareBtn');
  btn.innerHTML = '<span class="loading-spinner"></span>'; btn.disabled = true;
  const r = await fetch('/api/calculate/compare', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({categoryId:cat,costPrice:cost,sellingPrice:price,quantity:1}) });
  const resp = await r.json();
  renderCompare(resp.data);
  btn.innerHTML = '⚔️ Karşılaştır'; btn.disabled = false;
}

function renderCompare(data) {
  const c = document.getElementById('compareResults');
  c.style.display = 'grid';
  c.innerHTML = data.results.map((d,i) => {
    const ok = d.results.isProfitable;
    return `<div class="compare-card ${i===0?'best':''}" style="animation:fadeInUp 0.4s ease ${i*0.1}s both"><div class="compare-card-header"><span class="compare-card-logo">${d.platform.logo}</span><div><div class="compare-card-name">${d.platform.name}</div><div class="compare-card-rank">#${i+1}</div></div></div><div class="compare-profit" style="background:${ok?'var(--green-soft)':'var(--red-soft)'}"><div class="compare-profit-amount" style="color:${ok?'var(--green)':'var(--red)'}">${ok?'+':''}${d.results.netProfit.toFixed(2)} ₺</div></div><div class="compare-details"><div class="compare-detail"><span class="compare-detail-label">Komisyon</span><span class="compare-detail-value">${d.breakdown.commissionWithKDV.toFixed(2)}₺</span></div><div class="compare-detail"><span class="compare-detail-label">Kargo</span><span class="compare-detail-value">${d.breakdown.shippingCost.toFixed(2)}₺</span></div><div class="compare-detail"><span class="compare-detail-label">Başabaş</span><span class="compare-detail-value" style="color:var(--accent-light)">${d.recommendations.breakEvenPrice.toFixed(2)}₺</span></div></div></div>`;
  }).join('');
  c.scrollIntoView({behavior:'smooth'});
}

function renderPlatformsGrid() {
  document.getElementById('platformsGrid').innerHTML = platformsData.map(p => `
    <div class="platform-card">
      <div class="platform-card-header">
        <span class="platform-card-logo">${p.logo}</span>
        <span class="platform-card-name">${p.name}</span>
      </div>
      <p class="platform-card-desc">${p.description}</p>
      <div class="platform-card-stats">
        <div class="platform-stat"><div class="platform-stat-value">${p.baseShippingCost.toFixed(2)}₺</div><div class="platform-stat-label">Kargo</div></div>
        <div class="platform-stat"><div class="platform-stat-value">${p.serviceFee.toFixed(2)}₺</div><div class="platform-stat-label">Hizmet</div></div>
        <div class="platform-stat"><div class="platform-stat-value">${p.categoryCount}</div><div class="platform-stat-label">Kategori</div></div>
        <div class="platform-stat"><div class="platform-stat-value" style="color:var(--green)">Aktif</div><div class="platform-stat-label">Durum</div></div>
      </div>
    </div>`).join('');
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  if (tab === 'history') {
    document.querySelector('.tab:first-child').classList.add('active');
    document.getElementById('tabHistory').style.display = 'block';
  } else {
    document.querySelector('.tab:last-child').classList.add('active');
    document.getElementById('tabBulk').style.display = 'block';
  }
}

async function handleBulkUpload() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return;
  const box = document.getElementById('bulkResults');
  box.style.display = 'block';
  box.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-dim)">Analiz ediliyor...</p>';
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    let rows = [];
    if (file.name.endsWith('.csv')) {
      const lines = text.split('\n');
      for (let i=1;i<lines.length;i++) {
        if (!lines[i].trim()) continue;
        const c = lines[i].split(',').map(x=>x.trim());
        if (c.length>=5) rows.push({platform:c[0],category:c[1],name:c[2],cost:parseFloat(c[3])||0,selling:parseFloat(c[4])||0,quantity:parseInt(c[5])||1});
      }
    }
    if (!rows.length) { box.innerHTML='<p style="color:var(--red);text-align:center;padding:20px">Veri bulunamadı</p>'; return; }
    const results = rows.map(r => {
      const pl = platformsData.find(p=>p.name.toLowerCase().includes(r.platform.toLowerCase()))||platformsData[0];
      const cat = pl.categories.find(c=>c.name.toLowerCase().includes(r.category.toLowerCase()))||pl.categories[0];
      const kdvMultiplier = 1 + pl.kdvRate;
      const com = r.selling * cat.commissionRate * kdvMultiplier;
      const sh = pl.baseShippingCost;
      const sv = pl.serviceFee * kdvMultiplier;
      const pf = r.selling * pl.paymentProcessingFee;
      const net = r.selling - r.cost - com - sh - sv - pf;
      return {...r, net, total:net*r.quantity, margin:(net/r.selling*100), ok:net>0, logo:pl.logo};
    });
    const tRev=results.reduce((a,b)=>a+b.selling*b.quantity,0), tPr=results.reduce((a,b)=>a+b.total,0);
    box.innerHTML = `<div class="bulk-summary"><div class="bulk-summary-card neutral"><div class="bulk-summary-value">${tRev.toLocaleString('tr-TR',{minimumFractionDigits:2})} ₺</div><div class="bulk-summary-label">Ciro</div></div><div class="bulk-summary-card ${tPr>=0?'profit':'loss'}"><div class="bulk-summary-value" style="color:${tPr>=0?'var(--green)':'var(--red)'}">${tPr>=0?'+':''}${tPr.toLocaleString('tr-TR',{minimumFractionDigits:2})} ₺</div><div class="bulk-summary-label">Net Kâr</div></div></div><table class="bulk-table"><thead><tr><th>Platform</th><th>Ürün</th><th>Maliyet</th><th>Fiyat</th><th>Kâr</th><th>Adet</th><th>Toplam</th></tr></thead><tbody>${results.map(r=>`<tr><td>${r.logo} ${r.platform}</td><td>${r.name}</td><td>${r.cost.toFixed(2)}₺</td><td>${r.selling.toFixed(2)}₺</td><td style="color:${r.ok?'var(--green)':'var(--red)'};font-weight:600">${r.ok?'+':''}${r.net.toFixed(2)}₺</td><td>${r.quantity}</td><td style="color:${r.ok?'var(--green)':'var(--red)'};font-weight:600">${r.ok?'+':''}${r.total.toFixed(2)}₺</td></tr>`).join('')}</tbody></table>`;
  };
  reader.readAsText(file);
}
