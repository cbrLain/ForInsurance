/* js/ui.js : Composants UI réutilisables */

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type = 'info', dur = 3500) {
  const icons = { 
    success: '<i class="fas fa-check-circle"></i>', 
    error: '<i class="fas fa-times-circle"></i>', 
    info: '<i class="fas fa-info-circle"></i>', 
    warning: '<i class="fas fa-exclamation-triangle"></i>' 
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]||icons.info}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

// ── Modal ──────────────────────────────────────────────────────
const Modal = {
  open(title, bodyHTML, footer = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-bd').innerHTML = bodyHTML;
    document.getElementById('modal-ft').innerHTML = footer;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal-box').classList.remove('wide');
  },
  wide(title, bodyHTML, footer = '') {
    this.open(title, bodyHTML, footer);
    document.getElementById('modal-box').classList.add('wide');
  },
  close() { document.getElementById('modal').classList.add('hidden'); },
};
document.getElementById('modal-close').onclick = () => Modal.close();
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') Modal.close();
});

// ── Badges statut feuille ─────────────────────────────────────
function badgeStatut(s) {
  const map = {
    'Incomplète': { c: '#f59e0b', i: 'fas fa-exclamation-circle' },
    'Complétée':  { c: '#059669', i: 'fas fa-check-square' },
    'Remboursée': { c: '#16a34a', i: 'fas fa-money-bill-wave' },
    'Rejetée':    { c: '#dc2626', i: 'fas fa-times-circle' },
  };
  const m = map[s] || { c: '#6c757d', i: 'fas fa-circle' };
  return `<span style="color:${m.c};font-weight:600"><i class="${m.i}"></i> ${s}</span>`;
}
function badgeType(t) {
  return t === 'generaliste'
    ? '<span class="badge b-success-light"><i class="fas fa-stethoscope"></i> Généraliste</span>'
    : '<span class="badge b-primary-light"><i class="fas fa-microscope"></i> Spécialiste</span>';
}
function badgeMode(m) {
  return m === 'virement'
    ? '<span class="badge b-primary-light"><i class="fas fa-university"></i> Virement</span>'
    : '<span class="badge b-success-light"><i class="fas fa-coins"></i> Espèces</span>';
}

// ── Formatage ─────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtMoney(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('fr-CM', { style:'currency', currency:'XAF', minimumFractionDigits:0 }).format(n);
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ── Tableau vide ──────────────────────────────────────────────
function emptyRow(cols, msg = 'Aucun résultat') {
  return `<tr><td colspan="${cols}" class="empty"><i class="fas fa-search"></i><h4>${msg}</h4></td></tr>`;
}

// ── Loader ────────────────────────────────────────────────────
function setLoader(tbodyId, cols) {
  const tb = document.getElementById(tbodyId);
  if (tb) tb.innerHTML = `<tr><td colspan="${cols}" class="loader"><i class="fas fa-spinner" style="animation: spin 1s linear infinite"></i> Chargement…</td></tr>`;
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination(containerId, { page, totalPages, total, limit }, onPageChange) {
  const c = document.getElementById(containerId);
  if (!c) return;
  if (totalPages <= 1) { c.innerHTML = ''; return; }

  let html = '<div class="pagination">';
  html += `<button class="pg-first" ${page <= 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
  html += `<button class="pg-prev" ${page <= 1 ? 'disabled' : ''}><i class="fas fa-angle-left"></i></button>`;

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  if (start > 1) { html += '<button class="pg-num" data-p="1">1</button><span style="color:var(--text-dim);padding:0 4px">…</span>'; }
  for (let i = start; i <= end; i++) {
    html += `<button class="pg-num ${i === page ? 'active' : ''}" data-p="${i}">${i}</button>`;
  }
  if (end < totalPages) { html += '<span style="color:var(--text-dim);padding:0 4px">…</span>'; html += `<button class="pg-num" data-p="${totalPages}">${totalPages}</button>`; }

  html += `<button class="pg-next" ${page >= totalPages ? 'disabled' : ''}><i class="fas fa-angle-right"></i></button>`;
  html += `<button class="pg-last" ${page >= totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
  html += `<span class="p-info">${total} résultat${total !== 1 ? 's' : ''}</span>`;
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      let p;
      if (btn.classList.contains('pg-first')) p = 1;
      else if (btn.classList.contains('pg-prev')) p = page - 1;
      else if (btn.classList.contains('pg-next')) p = page + 1;
      else if (btn.classList.contains('pg-last')) p = totalPages;
      else p = parseInt(btn.dataset.p);
      if (p && p !== page) onPageChange(p);
    });
  });
}

// ── Mini chart (canvas donut) ─────────────────────────────────
function drawDonut(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data?.length) return;
  const ctx = canvas.getContext('2d');
  const colors = {
    'Incomplète':'#fcd34d','Complétée':'#86efac',
    'Remboursée':'#16a34a','Rejetée':'#ef4444'
  };
  const total = data.reduce((s, d) => s + d.n, 0);
  const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 20;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let start = -Math.PI / 2;
  data.forEach(d => {
    const angle = (d.n / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.fillStyle = colors[d.statut] || '#94a3b8';
    ctx.fill();
    start += angle;
  });
  // Trou centre
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // Texte centre
  ctx.fillStyle = '#212529';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 6);
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#6c757d';
  ctx.fillText('dossiers', cx, cy + 12);

  // Légende (en bas, centrée, multi-ligne si besoin)
  let lx = 10, ly = cy + r + 16, lineH = 16;
  data.forEach(d => {
    const txt = `${d.statut.split(' ')[0]} (${d.n})`;
    const tw = ctx.measureText(txt).width + 30;
    if (lx + tw > canvas.width - 10) { lx = 10; ly += lineH; }
    ctx.fillStyle = colors[d.statut] || '#adb5bd';
    ctx.fillRect(lx, ly, 10, 10);
    ctx.fillStyle = '#495057';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(txt, lx + 14, ly + 8);
    lx += tw;
  });
}
