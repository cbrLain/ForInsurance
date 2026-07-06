/* js/pages/recherche.js — Recherche globale */
let globalSearchTimer;

function loadRecherche() {
  const el = document.getElementById('global-results');
  el.innerHTML = '<div class="empty"><i class="fas fa-search"></i><h4>Effectuez une recherche pour voir les résultats</h4></div>';
}

document.getElementById('q-global')?.addEventListener('input', e => {
  clearTimeout(globalSearchTimer);
  const q = e.target.value.trim();
  if (!q || q.length < 2) {
    document.getElementById('global-results').innerHTML = '<div class="empty"><i class="fas fa-search"></i><h4>Effectuez une recherche pour voir les résultats</h4></div>';
    return;
  }
  globalSearchTimer = setTimeout(() => doGlobalSearch(q), 400);
});

async function doGlobalSearch(q) {
  const results = document.getElementById('global-results');
  results.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:28px;color:var(--text-muted)"></i></div>';

  const role = currentUser?.role;
  let html = '';

  try {
    // Recherche assurés
    try {
      const assures = await Api.getAssures(q);
      if (assures.length) {
        html += `
          <div class="card" style="margin-bottom:12px">
            <div class="card-hd"><h3><i class="fas fa-users"></i> Assurés (${assures.length})</h3></div>
            <div class="card-bd p0">
              <table class="tbl">
                <thead><tr><th>N° SS</th><th>Nom</th><th>Médecin traitant</th><th>Statut</th></tr></thead>
                <tbody>${assures.slice(0, 10).map(a => `
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

    // Recherche médecins
    try {
      const medecins = await Api.getMedecins(q);
      if (medecins.length) {
        html += `
          <div class="card" style="margin-bottom:12px">
            <div class="card-hd"><h3><i class="fas fa-user-md"></i> Médecins (${medecins.length})</h3></div>
            <div class="card-bd p0">
              <table class="tbl">
                <thead><tr><th>Identifiant</th><th>Nom</th><th>Type</th><th>Spécialité</th></tr></thead>
                <tbody>${medecins.slice(0, 10).map(m => `
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

    // Recherche feuilles
    try {
      const feuilles = await Api.getFeuilles({ q });
      if (feuilles.length) {
        html += `
          <div class="card" style="margin-bottom:12px">
            <div class="card-hd"><h3><i class="fas fa-file-medical-alt"></i> Feuilles de maladie (${feuilles.length})</h3></div>
            <div class="card-bd p0">
              <table class="tbl">
                <thead><tr><th>Référence</th><th>Assuré</th><th>Date</th><th>Statut</th></tr></thead>
                <tbody>${feuilles.slice(0, 10).map(f => `
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

    // Recherche remboursements (assureur)
    if (role === 'assureur') {
      try {
        const remb = await Api.getRemboursements(q);
        if (remb.length) {
          html += `
            <div class="card" style="margin-bottom:12px">
              <div class="card-hd"><h3><i class="fas fa-credit-card"></i> Remboursements (${remb.length})</h3></div>
              <div class="card-bd p0">
                <table class="tbl">
                  <thead><tr><th>Feuille</th><th>Assuré</th><th>Montant</th><th>Mode</th></tr></thead>
                  <tbody>${remb.slice(0, 10).map(r => `
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
