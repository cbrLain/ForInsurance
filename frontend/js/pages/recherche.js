/* js/pages/recherche.js — Recherche globale */
let globalSearchTimer;

function loadRecherche() {
  const el = document.getElementById('global-results');
  el.innerHTML = '<div class="empty"><i class="fas fa-search"></i><h4>Utilisez les filtres ci-dessus pour lancer une recherche</h4></div>';
}

function getFilters() {
  return {
    q: document.getElementById('q-global').value.trim(),
    date_from: document.getElementById('rf-date-from').value || '',
    date_to: document.getElementById('rf-date-to').value || '',
    statut: document.getElementById('rf-statut').value || '',
    category: document.getElementById('rf-category').value || '',
  };
}

['q-global', 'rf-date-from', 'rf-date-to', 'rf-statut', 'rf-category'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    clearTimeout(globalSearchTimer);
    const f = getFilters();
    if (!f.q) {
      document.getElementById('global-results').innerHTML = '<div class="empty"><i class="fas fa-search"></i><h4>Effectuez une recherche pour voir les résultats</h4></div>';
      return;
    }
    globalSearchTimer = setTimeout(() => doGlobalSearch(f), 400);
  });
});

async function doGlobalSearch(f) {
  const results = document.getElementById('global-results');
  results.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:28px;color:var(--text-muted)"></i></div>';

  const role = currentUser?.role;
  const { q, date_from, date_to, statut, category } = f;
  let html = '';

  const shouldShow = cat => !category || category === cat;

  try {
    if (shouldShow('assures')) {
      try {
        const assures = await Api.getAssures(q);
        if (assures?.data ? assures.data.length : assures?.length) {
          const list = assures.data || assures;
          html += `
            <div class="card" style="margin-bottom:12px">
              <div class="card-hd"><h3><i class="fas fa-users"></i> Assurés (${list.length})</h3></div>
              <div class="card-bd p0">
                <table class="tbl">
                  <thead><tr><th>N° SS</th><th>Nom</th><th>Médecin traitant</th><th>Statut</th></tr></thead>
                  <tbody>${list.slice(0, 10).map(a => `
                    <tr>
                      <td><code style="font-size:.8rem">${a.numero_ss}</code></td>
                      <td>${a.nom} ${a.prenom}</td>
                      <td>${a.medecin_traitant || '—'}</td>
                      <td>${a.actif ? '<span class="badge b-success">Actif</span>' : '<span class="badge b-danger">Inactif</span>'}</td>
                    </tr>
                  `).join('')}</tbody>
                </table>
              </div>
            </div>
          `;
        }
      } catch {}
    }

    if (shouldShow('medecins')) {
      try {
        const medecins = await Api.getMedecins(q);
        const list = medecins.data || medecins;
        if (list.length) {
          html += `
            <div class="card" style="margin-bottom:12px">
              <div class="card-hd"><h3><i class="fas fa-user-md"></i> Médecins (${list.length})</h3></div>
              <div class="card-bd p0">
                <table class="tbl">
                  <thead><tr><th>Identifiant</th><th>Nom</th><th>Type</th><th>Spécialité</th></tr></thead>
                  <tbody>${list.slice(0, 10).map(m => `
                    <tr>
                      <td><code>${m.identifiant}</code></td>
                      <td>Dr. ${m.nom} ${m.prenom}</td>
                      <td>${m.type === 'generaliste' ? 'Généraliste' : 'Spécialiste'}</td>
                      <td>${m.specialite || '—'}</td>
                    </tr>
                  `).join('')}</tbody>
                </table>
              </div>
            </div>
          `;
        }
      } catch {}
    }

    if (shouldShow('feuilles')) {
      try {
        const feuillesParams = { q };
        if (statut) feuillesParams.statut = statut;
        if (!category && statut) feuillesParams.statut = statut;
        const feuilles = await Api.getFeuilles(feuillesParams);
        const list = feuilles.data || feuilles;
        const filtered = date_from || date_to
          ? list.filter(f => {
              const d = new Date(f.date_consultation || f.created_at);
              if (date_from && d < new Date(date_from)) return false;
              if (date_to && d > new Date(date_to + 'T23:59:59')) return false;
              return true;
            })
          : list;
        if (filtered.length) {
          html += `
            <div class="card" style="margin-bottom:12px">
              <div class="card-hd"><h3><i class="fas fa-file-medical-alt"></i> Feuilles de maladie (${filtered.length})</h3></div>
              <div class="card-bd p0">
                <table class="tbl">
                  <thead><tr><th>Référence</th><th>Assuré</th><th>Date</th><th>Statut</th></tr></thead>
                  <tbody>${filtered.slice(0, 10).map(f => `
                    <tr>
                      <td><code>${f.reference}</code></td>
                      <td>${f.assure_nom}</td>
                      <td>${fmtDate(f.date_consultation)}</td>
                      <td>${badgeStatut(f.statut)}</td>
                    </tr>
                  `).join('')}</tbody>
                </table>
              </div>
            </div>
          `;
        }
      } catch {}
    }

    if (role === 'assureur' && shouldShow('remboursements')) {
      try {
        const remb = await Api.getRemboursements(q);
        const list = remb.data || remb;
        const filtered = date_from || date_to
          ? list.filter(r => {
              const d = new Date(r.date_remboursement);
              if (date_from && d < new Date(date_from)) return false;
              if (date_to && d > new Date(date_to + 'T23:59:59')) return false;
              return true;
            })
          : list;
        if (filtered.length) {
          html += `
            <div class="card" style="margin-bottom:12px">
              <div class="card-hd"><h3><i class="fas fa-credit-card"></i> Remboursements (${filtered.length})</h3></div>
              <div class="card-bd p0">
                <table class="tbl">
                  <thead><tr><th>Feuille</th><th>Assuré</th><th>Montant</th><th>Mode</th></tr></thead>
                  <tbody>${filtered.slice(0, 10).map(r => `
                    <tr>
                      <td><code>${r.feuille_ref}</code></td>
                      <td>${r.assure_nom}</td>
                      <td style="font-weight:700;color:var(--success)">${fmtMoney(r.montant)}</td>
                      <td>${badgeMode(r.mode_paiement)}</td>
                    </tr>
                  `).join('')}</tbody>
                </table>
              </div>
            </div>
          `;
        }
      } catch {}
    }

    if (!html) {
      html = '<div class="empty"><i class="fas fa-search-minus"></i><h4>Aucun résultat pour "' + q + '"</h4></div>';
    }

    results.innerHTML = html;
  } catch(e) {
    results.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-triangle"></i> ' + e.message + '</div>';
  }
}
