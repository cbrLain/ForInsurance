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

      // Afficher les demandes en attente
      const demandesSection = document.getElementById('demandes-section');
      if (demandesSection) {
        demandesSection.classList.remove('hidden');
        const badge = demandesSection.querySelector('.demandes-badge');
        if (badge) {
          badge.textContent = d.demandesEnAttente;
          badge.classList.toggle('hidden', d.demandesEnAttente === 0);
        }
        if (d.demandesEnAttente > 0) loadDemandesInscription();
      }
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

    // Chart
    if (d.parStatut?.length) {
      setTimeout(() => drawDonut('chart-statut', d.parStatut), 100);
    }
  } catch(e) {
    console.error(e);
  }
}

async function loadDemandesInscription() {
  try {
    const res = await fetch('/api/auth/demandes', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ss_token') }
    });
    const demandes = await res.json();
    const list = document.getElementById('demandes-list');
    if (!list) return;
    list.innerHTML = demandes.filter(d => d.statut === 'en_attente').map(d => `
      <div class="demande-item">
        <div>
          <strong>Dr. ${d.nom} ${d.prenom}</strong><br>
          <small>${d.email} · ${d.num_agrement} · ${d.type}${d.specialite ? ' - ' + d.specialite : ''}</small>
        </div>
        <div class="demande-actions" style="display:flex;gap:6px">
          <button class="btn btn-sm btn-success" onclick="approuverDemande(${d.id})"><i class="fas fa-check"></i> Approuver</button>
          <button class="btn btn-sm btn-danger" onclick="rejeterDemande(${d.id})"><i class="fas fa-times"></i> Rejeter</button>
        </div>
      </div>
    `).join('') || '<div class="empty"><i class="fas fa-inbox"></i><h4>Aucune demande en attente</h4></div>';
  } catch(e) {
    console.error(e);
  }
}

async function approuverDemande(id) {
  if (!confirm('Approuver cette demande ? Un email sera envoyé avec les identifiants.')) return;
  try {
    const res = await fetch('/api/auth/demandes/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('ss_token') },
      body: JSON.stringify({ statut: 'approuvee' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert(data.message);
    loadDemandesInscription();
    loadDashboard('assureur');
  } catch(e) { alert(e.message); }
}

async function rejeterDemande(id) {
  const motif = prompt('Motif du rejet (optionnel) :');
  if (motif === null) return;
  try {
    const res = await fetch('/api/auth/demandes/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('ss_token') },
      body: JSON.stringify({ statut: 'rejetee', motif_rejet: motif || '' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert(data.message);
    loadDemandesInscription();
  } catch(e) { alert(e.message); }
}
