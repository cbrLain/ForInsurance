/* js/pages/feuilles.js */
let feuillesFilter = 'all';
let feuillesPage = 1;
let fellesDateFrom = '';
let fellesDateTo = '';
let mfeuillesPage = 1;

/* ── Assureur : toutes les feuilles ───────────────────────── */
async function loadFeuilles(q = '', pg) {
  if (pg !== undefined) feuillesPage = pg;
  setLoader('tbody-feuilles', 7);
  try {
    const params = { page: feuillesPage, limit: 20 };
    if (q) params.q = q;
    if (feuillesFilter !== 'all') params.statut = feuillesFilter;
    if (fellesDateFrom) params.date_from = fellesDateFrom;
    if (fellesDateTo) params.date_to = fellesDateTo;
    const res = await Api.getFeuilles(params);
    renderFeuilles(res.data);
    renderPagination('pag-feuilles', res, p => { feuillesPage = p; loadFeuilles(q); });
  } catch(e) { toast(e.message, 'error'); }
}

function renderFeuilles(rows) {
  const tb = document.getElementById('tbody-feuilles');
  if (!rows.length) { tb.innerHTML = emptyRow(7, 'Aucune feuille de maladie'); return; }
  tb.innerHTML = rows.map(f => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${f.reference}</code></td>
      <td>${f.assure_nom}<br><small style="color:var(--text-muted)">${f.numero_ss}</small></td>
      <td>Dr. ${f.medecin_nom}<br><small style="color:var(--text-muted)">${f.medecin_type}</small></td>
      <td>${fmtDate(f.date_consultation)}</td>
      <td>${badgeStatut(f.statut)}</td>
      <td>${fmtMoney(f.montant_remboursement)}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewFeuille(${f.id})"><i class="fas fa-eye"></i> Voir</button>
      </div></td>
    </tr>
  `).join('');
}

async function changerStatutFeuille(id, statut, notes) {
  try {
    await Api.changerStatut(id, statut, notes);
    toast(`Statut mis à jour : ${statut}`, 'success');
    if (document.getElementById('tbody-feuilles'))   loadFeuilles();
    if (document.getElementById('tbody-mfeuilles'))  loadMesFeuilles();
  } catch(e) { toast(e.message, 'error'); }
}

async function viewFeuille(id) {
  try {
    const f = await Api.getFeuille(id);
    const transitions = {
      'Incomplète': ['Rejetée'],
      'Complétée': ['Rejetée'],
    };
    const btns = (transitions[f.statut] || []).map(s =>
      `<button class="btn btn-sm btn-danger" onclick="changerStatutDepuisModal(${f.id},'${s}')"><i class="fas fa-arrow-right"></i> ${s}</button>`
    ).join('');

    Modal.wide(`Feuille de maladie : ${f.reference}`, `
      <div style="margin-bottom:10px">${badgeStatut(f.statut)}</div>
      <div class="prt-section">
        <h4>Assuré</h4>
        <div class="prt-row"><span class="prt-key">N° SS</span><span class="prt-val" style="color:var(--text-muted)">${f.numero_ss}</span></div>
        <div class="prt-row"><span class="prt-key">Nom</span><span class="prt-val">${f.assure_nom}</span></div>
      </div>
      <div class="prt-section">
        <h4>Consultation</h4>
        <div class="prt-row"><span class="prt-key">Médecin</span><span class="prt-val">Dr. ${f.medecin_nom}</span></div>
        <div class="prt-row"><span class="prt-key">Date</span><span class="prt-val">${fmtDate(f.date_consultation)}</span></div>
        <div class="prt-row"><span class="prt-key">Diagnostic</span><span class="prt-val">${f.diagnostic}</span></div>
        <div class="prt-row"><span class="prt-key">Actes médicaux</span><span class="prt-val">${f.actes_medicaux || ''}</span></div>
      </div>
      <div class="prt-section">
        <h4>Remboursement</h4>
        <div class="prt-row"><span class="prt-key">Honoraires</span><span class="prt-val">${fmtMoney(f.montant_honoraires)}</span></div>
        <div class="prt-row"><span class="prt-key">Taux</span><span class="prt-val">${((f.taux_remboursement||0.7)*100).toFixed(0)}%</span></div>
        <div class="prt-row"><span class="prt-key">Montant remboursé</span><span class="prt-val" style="color:var(--success);font-weight:700">${fmtMoney(f.montant_remboursement)}</span></div>
        <div class="prt-row"><span class="prt-key">Mode paiement</span><span class="prt-val">${f.mode_paiement ? badgeMode(f.mode_paiement) : ''}</span></div>
      </div>
      ${f.notes ? `<div class="alert alert-info" style="margin-top:8px"><i class="fas fa-info-circle"></i> ${f.notes}</div>` : ''}
    `, `${btns}<button class="btn btn-secondary" onclick="Modal.close()">Fermer</button>`);
  } catch(e) { toast(e.message, 'error'); }
}

async function changerStatutDepuisModal(id, statut) {
  await changerStatutFeuille(id, statut);
  Modal.close();
}

function showCompleter(id) {
  // Version directe (depuis le tableau) : on connaît déjà l'ID
  Modal.open('Compléter la feuille de maladie', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">
      <strong>Étape 2 :</strong> renseignez le montant et le mode de remboursement.
    </p>
    <div class="form-row">
      <div class="form-group"><label>Montant à rembourser (FCFA) *</label><input id="c-mont" type="number" min="0" placeholder="15000"/></div>
      <div class="form-group">
        <label>Mode de paiement *</label>
        <select id="c-mode">
          <option value="">-- Choisir --</option>
          <option value="especes">Espèces</option>
          <option value="virement">Virement bancaire</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Notes (optionnel)</label><textarea id="c-notes" rows="2" placeholder="Observations…"></textarea></div>
    <div id="c-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitCompleter(${id})"><i class="fas fa-check"></i> Valider et compléter</button>
  `);
}

function submitCompleter(id) {
  // Surcharge : si id est passé, c'est la version directe (depuis le tableau)
  const err = document.getElementById('c-err');
  err.classList.add('hidden');
  const feuilleId = id || document.getElementById('c-form')?.dataset.feuilleId;
  const montant = document.getElementById('c-mont').value;
  const mode = document.getElementById('c-mode').value;
  if (!feuilleId) { err.textContent = 'Aucune feuille sélectionnée.'; err.classList.remove('hidden'); return; }
  if (!montant || !mode) {
    err.textContent = 'Montant et mode de paiement sont requis.';
    err.classList.remove('hidden'); return;
  }
  try {
    Api.completerFeuille(feuilleId, {
      montant_remboursement: montant,
      mode_paiement: mode,
      notes: document.getElementById('c-notes').value.trim() || null,
    }).then(() => {
      Modal.close();
      toast('Feuille complétée avec succès !', 'success');
      loadFeuilles();
    }).catch(e => { err.textContent = e.message; err.classList.remove('hidden'); });
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

function showCompleterByRef() {
  Modal.open('Compléter une feuille de maladie', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">
      <strong>Étape 1 :</strong> recherchez la feuille par référence, patient ou N° SS — sélectionnez-la dans la liste.
    </p>
    <div class="form-group">
      <label>Feuille de maladie *</label>
      <div class="ss-wrapper">
        <input id="c-ref" placeholder="Référence, nom assuré, N° SS…" autocomplete="off"/>
        <div id="c-results" class="ss-results"></div>
        <input type="hidden" id="c-feuille-id"/>
      </div>
      <div id="c-ref-info" style="margin-top:6px;font-size:.85rem"></div>
    </div>
    <div id="c-form" style="display:none">
      <hr style="margin:14px 0;border:none;border-top:1px solid var(--border)">
      <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">
        <strong>Étape 2 :</strong> renseignez le montant et le mode de remboursement.
      </p>
      <div class="form-row">
        <div class="form-group"><label>Montant à rembourser (FCFA) *</label><input id="c-mont2" type="number" min="0" placeholder="15000"/></div>
        <div class="form-group">
          <label>Mode de paiement *</label>
          <select id="c-mode2">
            <option value="">-- Choisir --</option>
            <option value="especes">Espèces</option>
            <option value="virement">Virement bancaire</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notes (optionnel)</label><textarea id="c-notes2" rows="2" placeholder="Observations…"></textarea></div>
      <div id="c-err" class="alert alert-error hidden"></div>
      <button class="btn btn-primary" onclick="submitCompleterByRef()" style="width:100%;margin-top:6px"><i class="fas fa-check"></i> Valider et compléter</button>
    </div>
  `, `<button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>`);

  window._cSearch = SearchSelect.create({
    input: document.getElementById('c-ref'),
    hidden: document.getElementById('c-feuille-id'),
    results: document.getElementById('c-results'),
    minLength: 2,
    search: async (q) => {
      const token = localStorage.getItem('ss_token');
      const res = await fetch('/api/feuilles/search?q=' + encodeURIComponent(q), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const list = await res.json();
      return (list || []).filter(f => f.statut === 'Incomplète').map(f => ({
        id: f.id,
        label: `${f.reference} — ${f.assure_nom}`,
        reference: f.reference,
        nom: f.reference,
        assure_nom: f.assure_nom,
        medecin_nom: f.medecin_nom,
        statut: f.statut,
        value: f.id
      }));
    },
    render: (f) => `<strong>${f.reference}</strong> <span style="float:right;font-size:.75rem">${badgeStatut(f.statut)}</span><br><small>${f.assure_nom} · Dr. ${f.medecin_nom}</small>`,
    onSelect: async (item) => {
      const info = document.getElementById('c-ref-info');
      const form = document.getElementById('c-form');
      try {
        const feuille = await Api.getFeuilleByRef(item.reference);
        info.innerHTML = `<i class="fas fa-check-circle"></i> ${feuille.assure_nom} — ${feuille.diagnostic}`;
        info.style.color = 'var(--primary)';
        form.style.display = 'block';
        form.dataset.feuilleId = feuille.id;
      } catch(e) {
        info.innerHTML = '<i class="fas fa-times-circle"></i> ' + e.message;
        info.style.color = 'var(--danger)';
        form.style.display = 'none';
      }
    },
  });
}

async function submitCompleterByRef() {
  const err = document.getElementById('c-err');
  err.classList.add('hidden');
  const id = document.getElementById('c-feuille-id')?.value || document.getElementById('c-form')?.dataset?.feuilleId;
  const montant = document.getElementById('c-mont2').value;
  const mode = document.getElementById('c-mode2').value;
  if (!id) { err.textContent = 'Aucune feuille sélectionnée.'; err.classList.remove('hidden'); return; }
  if (!montant || !mode) {
    err.textContent = 'Montant et mode de paiement sont requis.';
    err.classList.remove('hidden'); return;
  }
  try {
    await Api.completerFeuille(id, {
      montant_remboursement: montant,
      mode_paiement: mode,
      notes: document.getElementById('c-notes2').value.trim() || null,
    });
    Modal.close();
    toast('Feuille complétée avec succès !', 'success');
    loadFeuilles();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

// Filtre par statut
document.getElementById('ft-feuilles').addEventListener('click', e => {
  const tab = e.target.closest('.ftab');
  if (!tab) return;
  document.querySelectorAll('#ft-feuilles .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  feuillesFilter = tab.dataset.v;
  feuillesPage = 1;
  loadFeuilles(document.getElementById('q-feuilles').value);
});

document.getElementById('q-feuilles').addEventListener('input', e => {
  clearTimeout(window._qf);
  const v = e.target.value;
  feuillesPage = 1;
  if (!v) { loadFeuilles(''); return; }
  window._qf = setTimeout(() => loadFeuilles(v), 300);
});

document.getElementById('btn-filter-feuilles')?.addEventListener('click', () => {
  Modal.open('Filtrer par date', `
    <div style="padding:8px 0">
      <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">Date début</label>
      <input type="date" id="modal-feuilles-from" class="search" style="width:100%;margin-bottom:12px" value="${fellesDateFrom}"/>
      <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">Date fin</label>
      <input type="date" id="modal-feuilles-to" class="search" style="width:100%;margin-bottom:16px" value="${fellesDateTo}"/>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" id="modal-feuilles-apply" style="flex:1">Appliquer</button>
        <button class="btn btn-secondary" id="modal-feuilles-clear" style="flex:1">Effacer</button>
      </div>
    </div>
  `, '');
  setTimeout(() => {
    document.getElementById('modal-feuilles-apply')?.addEventListener('click', () => {
      fellesDateFrom = document.getElementById('modal-feuilles-from').value;
      fellesDateTo = document.getElementById('modal-feuilles-to').value;
      Modal.close();
      feuillesPage = 1;
      loadFeuilles(document.getElementById('q-feuilles').value);
    });
    document.getElementById('modal-feuilles-clear')?.addEventListener('click', () => {
      fellesDateFrom = '';
      fellesDateTo = '';
      Modal.close();
      feuillesPage = 1;
      loadFeuilles(document.getElementById('q-feuilles').value);
    });
  }, 50);
});

/* ── Médecin : ses propres feuilles ──────────────────────── */
async function loadMesFeuilles(q = '', pg) {
  if (pg !== undefined) mfeuillesPage = pg;
  setLoader('tbody-mfeuilles', 6);
  try {
    const params = { page: mfeuillesPage, limit: 20 };
    if (q) params.q = q;
    const res = await Api.getFeuilles(params);
    renderMesFeuilles(res.data);
    renderPagination('pag-mfeuilles', res, p => { mfeuillesPage = p; loadMesFeuilles(q); });
  } catch(e) { toast(e.message, 'error'); }
}

function renderMesFeuilles(rows) {
  const tb = document.getElementById('tbody-mfeuilles');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucune feuille créée'); return; }
  tb.innerHTML = rows.map(f => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${f.reference}</code></td>
      <td style="color:var(--text-muted)">${f.numero_ss}</td>
      <td>${fmtDate(f.date_consultation)}</td>
      <td>${f.diagnostic}</td>
      <td>${badgeStatut(f.statut)}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewFeuille(${f.id})"><i class="fas fa-eye"></i> Voir</button>
        ${f.statut === 'Incomplète' ? `<button class="btn btn-sm btn-danger" onclick="supprimerFeuille(${f.id})"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
      </div></td>
    </tr>
  `).join('');
}

async function supprimerFeuille(id) {
  const ok = await confirmDialog('Supprimer (rejeter) cette feuille de maladie ?', { danger: true });
  if (!ok) return;
  await changerStatutFeuille(id, 'Rejetée');
}

function showAddFeuille() {
  Modal.open('Nouvelle feuille de maladie', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Enregistrez les informations de la consultation pour permettre le remboursement de l'assuré.</p>
    <div class="form-group">
      <label>Assuré *</label>
      <div class="ss-wrapper">
        <input id="nf-search" placeholder="Tapez le nom, prénom, N° SS ou téléphone…"/>
        <div id="nf-results" class="ss-results"></div>
      </div>
      <input type="hidden" id="nf-assure-id"/>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date de consultation *</label><input id="nf-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label>Honoraires (FCFA)</label><input id="nf-mont" type="number" min="0" placeholder="15000" oninput="calcRemb()"/></div>
    </div>
    <div id="nf-remb-info" style="font-size:.8rem;color:var(--success);margin-bottom:8px"></div>
    <div class="form-group"><label>Diagnostic *</label><input id="nf-diag" placeholder="Grippe saisonnière, Hypertension…"/></div>
    <div class="form-group"><label>Actes médicaux réalisés</label><textarea id="nf-actes" rows="2" placeholder="Consultation, prise de sang, ECG…"></textarea></div>
    <div class="form-group"><label>Notes</label><textarea id="nf-notes" rows="2" placeholder="Observations complémentaires…"></textarea></div>
    <div id="nf-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitAddFeuille()"><i class="fas fa-save"></i> Enregistrer</button>
  `);

  window._nfSearch = SearchSelect.create({
    input: document.getElementById('nf-search'),
    hidden: document.getElementById('nf-assure-id'),
    results: document.getElementById('nf-results'),
    minLength: 2,
    search: async (q) => {
      const res = await Api.getAssures(q);
      return (res.data || []).map(a => ({
        id: a.id,
        nom: a.nom,
        prenom: a.prenom,
        label: `${a.nom} ${a.prenom} — ${a.numero_ss}`,
        detail: `${a.telephone || ''}`,
        numero_ss: a.numero_ss
      }));
    },
    render: (a) => `<strong>${a.nom} ${a.prenom}</strong><br><small>${a.numero_ss} ${a.detail ? '· '+a.detail : ''}</small>`,
  });
}

function calcRemb() {
  const mont = parseFloat(document.getElementById('nf-mont').value);
  const info = document.getElementById('nf-remb-info');
  const taux = currentUser?.medecin_type === 'specialiste' ? 0.8 : 1.0;
  if (!isNaN(mont) && mont > 0) {
    info.textContent = `\u2192 Remboursement estimé (${(taux*100).toFixed(0)}%) : ${fmtMoney(Math.round(mont * taux))}`;
  } else {
    info.textContent = '';
  }
}

async function submitAddFeuille() {
  const err = document.getElementById('nf-err');
  err.classList.add('hidden');
  const assure_id = document.getElementById('nf-assure-id').value;
  const data = {
    assure_id: assure_id ? parseInt(assure_id) : null,
    date_consultation: document.getElementById('nf-date').value,
    diagnostic: document.getElementById('nf-diag').value.trim(),
    actes_medicaux: document.getElementById('nf-actes').value.trim() || null,
    montant_honoraires: document.getElementById('nf-mont').value || null,
    notes: document.getElementById('nf-notes').value.trim() || null,
  };
  if (!data.assure_id) { err.textContent = 'Assuré introuvable : vérifiez le N° SS.'; err.classList.remove('hidden'); return; }
  if (!data.date_consultation || !data.diagnostic) { err.textContent = 'Date et diagnostic sont obligatoires.'; err.classList.remove('hidden'); return; }
  try {
    const r = await Api.addFeuille(data);
    Modal.close(); toast(`Feuille ${r.reference} créée (brouillon).`, 'success');
    loadMesFeuilles();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

document.getElementById('btn-add-feuille').onclick = showAddFeuille;
document.getElementById('q-mfeuilles').addEventListener('input', e => {
  clearTimeout(window._qmf);
  const v = e.target.value;
  mfeuillesPage = 1;
  if (!v) { loadMesFeuilles(''); return; }
  window._qmf = setTimeout(() => loadMesFeuilles(v), 300);
});

const btnCompleter = document.getElementById('btn-completer-feuille');
if (btnCompleter) btnCompleter.onclick = showCompleterByRef;
