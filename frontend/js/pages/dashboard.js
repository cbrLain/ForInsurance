/* js/pages/dashboard.js */
async function loadDashboard(role) {
  try {
    const d = await Api.getStats();
    const grid = document.getElementById('stats-grid');

    if (role === 'assureur') {
      grid.innerHTML = `
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-users"></i></div><div><div class="stat-val">${d.totalAssures}</div><div class="stat-lbl">Assurés actifs</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-user-md"></i></div><div><div class="stat-val">${d.totalMedecins}</div><div class="stat-lbl">Médecins enregistrés</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-file-invoice"></i></div><div><div class="stat-val">${d.totalFeuilles}</div><div class="stat-lbl">Feuilles de maladie</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-credit-card"></i></div><div><div class="stat-val">${fmtMoney(d.totalRemb)}</div><div class="stat-lbl">Total remboursé</div></div></div>
      `;
    } else {
      grid.innerHTML = `
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-file-invoice"></i></div><div><div class="stat-val">${d.totalFeuilles}</div><div class="stat-lbl">Mes feuilles</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-prescription-bottle-alt"></i></div><div><div class="stat-val">${d.totalPrescriptions}</div><div class="stat-lbl">Prescriptions émises</div></div></div>
      `;
    }

    // Activité récente
    const actList = document.getElementById('activity-list');
    actList.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'activity-list';
    const dotColors = { 'Remboursée':'#16a34a','Complétée':'#059669','Rejetée':'#dc2626','Incomplète':'#f59e0b' };
    if (d.activiteRecente?.length) {
      el.innerHTML = d.activiteRecente.map(a => `
        <div class="act-item">
          <div class="act-dot" style="background:${dotColors[a.statut]||'#6c757d'}"></div>
          <div><div class="act-text">${a.texte} : ${badgeStatut(a.statut)}</div>
          <div class="act-time">${fmtDateTime(a.date)}</div></div>
        </div>
      `).join('');
    } else {
      el.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><h4>Aucune activité</h4></div>';
    }
    actList.appendChild(el);

    // Chart (Chart.js — barres horizontales)
    if (d.parStatut?.length) {
      const canvas = document.getElementById('chart-statut');
      if (canvas._chart) canvas._chart.destroy();
      const colors = { 'Incomplète':'#fcd34d','Complétée':'#86efac','Remboursée':'#16a34a','Rejetée':'#ef4444' };
      canvas._chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: d.parStatut.map(x => x.statut),
          datasets: [{
            data: d.parStatut.map(x => x.n),
            backgroundColor: d.parStatut.map(x => colors[x.statut] || '#94a3b8'),
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { stepSize: 1 } },
            y: { grid: { display: false } }
          }
        }
      });
    }
  } catch(e) {
    console.error(e);
  }
}


