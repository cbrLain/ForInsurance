/* js/pages/remboursements.js */
async function loadRemboursements(q = '') {
  setLoader('tbody-remb', 7);
  try {
    const rows = await Api.getRemboursements(q);
    renderRemboursements(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderRemboursements(rows) {
  const tb = document.getElementById('tbody-remb');
  if (!rows.length) { tb.innerHTML = emptyRow(7, 'Aucun remboursement enregistré'); return; }
  tb.innerHTML = rows.map(r => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${r.feuille_ref}</code></td>
      <td>${r.assure_nom}<br><small style="color:var(--text-muted)">${r.numero_ss}</small></td>
      <td style="font-weight:700;color:var(--success)">${fmtMoney(r.montant)}</td>
      <td>${badgeMode(r.mode_paiement)}</td>
      <td>${fmtDateTime(r.date_remboursement)}</td>
      <td>${r.assureur_nom || '<span class="text-muted">—</span>'}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewFacture(${r.id})"><i class="fas fa-receipt"></i> Facture</button>
      </div></td>
    </tr>
  `).join('');
}

/* ── Modale remboursement avec simulation réaliste ───── */
function showRembourser(feuilleId, ref, montant, assureId, assureNom) {
  Modal.open(`Remboursement : ${ref}`, `
    <div class="alert alert-info" style="margin-bottom:14px">
      <i class="fas fa-info-circle"></i> Montant à rembourser : <strong style="font-size:1.1rem">${fmtMoney(montant)}</strong>
    </div>
    <div class="form-group">
      <label>Mode de paiement *</label>
      <select id="r-mode" onchange="toggleRembMode()">
        <option value="">-- Choisir --</option>
        <option value="especes">💰 Espèces (guichet)</option>
        <option value="virement">🏦 Virement bancaire</option>
      </select>
    </div>

    <div id="rmode-especes" style="display:none">
      <div class="alert alert-warning" style="margin-top:10px">
        <i class="fas fa-hand-holding-usd"></i> Paiement en espèces au guichet de l'agence.
      </div>
      <div class="form-group">
        <label>Référence de retrait</label>
        <input id="r-ref-especes" value="RET-${String(Date.now()).slice(-8)}" readonly style="background:var(--bg-card);color:var(--text-muted)"/>
      </div>
    </div>

    <div id="rmode-virement" style="display:none">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:8px">
        <h4 style="font-size:.82rem;margin-bottom:10px;color:var(--text-muted)">INFORMATIONS BANCAIRES</h4>
        <div class="form-group">
          <label>Bénéficiaire</label>
          <input id="r-benef" value="${assureNom || '—'}" readonly style="background:var(--bg-card);color:var(--text-muted);font-weight:600"/>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Banque de l'assuré</label>
            <select id="r-banque">
              <option value="">-- Sélectionner --</option>
              <option value="Afriland First Bank">Afriland First Bank</option>
              <option value="BICEC">BICEC</option>
              <option value="Société Générale Cameroun">Société Générale Cameroun</option>
              <option value="Ecobank Cameroun">Ecobank Cameroun</option>
              <option value="Attijari Cameroun">Attijari Cameroun</option>
              <option value="UBA Cameroun">UBA Cameroun</option>
              <option value="Crédit Mutuel">Crédit Mutuel</option>
            </select>
          </div>
          <div class="form-group" style="flex:0 0 100px">
            <label>Code banque</label>
            <input id="r-code-banque" placeholder="10001" maxlength="5"/>
          </div>
        </div>
        <div class="form-group">
          <label>IBAN (International Bank Account Number)</label>
          <input id="r-iban" placeholder="CM21 10001 00001 23456789012 80" style="font-family:monospace;letter-spacing:1px"/>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Motif du virement</label>
            <select id="r-motif">
              <option value="Remboursement feuille de maladie">Remboursement feuille de maladie</option>
              <option value="Prestation médicale">Prestation médicale</option>
              <option value="Indemnité maladie">Indemnité maladie</option>
            </select>
          </div>
        </div>
        <div style="font-size:.72rem;color:var(--text-dim);background:var(--bg-input);padding:8px;border-radius:4px;margin-top:6px">
          <i class="fas fa-lock"></i> Transmission sécurisée via le réseau interbancaire CMR (ETEBAC)
        </div>
      </div>
    </div>

    <div id="r-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-success" onclick="submitRembourser(${feuilleId}, '${ref}', ${montant})"><i class="fas fa-paper-plane"></i> Envoyer le paiement</button>
  `);
}

function toggleRembMode() {
  const mode = document.getElementById('r-mode').value;
  document.getElementById('rmode-especes').style.display = mode === 'especes' ? 'block' : 'none';
  document.getElementById('rmode-virement').style.display = mode === 'virement' ? 'block' : 'none';
  if (mode === 'virement' && !document.getElementById('r-iban').value) {
    document.getElementById('r-iban').value = 'CM21 ' + String(Math.floor(10000 + Math.random()*90000)) + ' ' + String(Math.floor(10000 + Math.random()*90000)) + ' ' + String(Math.floor(10000000000 + Math.random()*90000000000)) + ' ' + String(Math.floor(10 + Math.random()*89));
  }
}

async function submitRembourser(feuilleId, ref, montant) {
  const err = document.getElementById('r-err');
  err.classList.add('hidden');
  const mode = document.getElementById('r-mode').value;
  if (!mode) { err.textContent = 'Veuillez choisir un mode de paiement.'; err.classList.remove('hidden'); return; }

  let refBancaire;
  const banque = mode === 'virement' ? document.getElementById('r-banque').value : null;
  const iban = mode === 'virement' ? document.getElementById('r-iban').value.trim() : null;

  if (mode === 'virement') {
    if (!banque) { err.textContent = 'Veuillez sélectionner la banque de l\'assuré.'; err.classList.remove('hidden'); return; }
    if (!iban || iban.length < 10) { err.textContent = 'Veuillez saisir un IBAN valide.'; err.classList.remove('hidden'); return; }
    refBancaire = `VIR-${String(Date.now()).slice(-8)}-${banque.substring(0,4).toUpperCase()}`;
  } else {
    refBancaire = document.getElementById('r-ref-especes')?.value || null;
  }

  const data = { feuille_id: feuilleId, mode_paiement: mode, reference_bancaire: refBancaire };

  try {
    const result = await Api.effectuerRemboursement(data);
    const resultId = result.id;

    if (mode === 'especes') {
      Modal.open('Paiement en espèces', `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:56px;margin-bottom:10px;color:var(--success)"><i class="fas fa-hand-holding-usd"></i></div>
          <h3 style="margin-bottom:4px">Paiement en espèces</h3>
          <p style="color:var(--text-muted);font-size:.85rem">Montant décaissé : <strong style="font-size:1.3rem;color:var(--success)">${fmtMoney(montant)}</strong></p>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;margin:14px auto;max-width:300px;text-align:left">
            <div class="prt-row"><span class="prt-key">Opération</span><span class="prt-val">Retrait guichet</span></div>
            <div class="prt-row"><span class="prt-key">Référence</span><span class="prt-val">${refBancaire}</span></div>
            <div class="prt-row"><span class="prt-key">Date</span><span class="prt-val">${fmtDateTime(new Date())}</span></div>
            <div class="prt-row"><span class="prt-key">Agent</span><span class="prt-val">${currentUser?.prenom || ''} ${currentUser?.nom || ''}</span></div>
          </div>
          <div class="alert alert-success" style="text-align:left">
            <i class="fas fa-check-circle"></i> Espèces remises à l'assuré. Ticket de caisse imprimé.
          </div>
        </div>
      `, `
        <button class="btn btn-primary" onclick="Modal.close();loadFeuilles();loadRemboursements();viewFacture(${resultId})"><i class="fas fa-receipt"></i> Voir la facture</button>
      `);
    } else {
      const contenu = document.getElementById('modal-bd');
      contenu.innerHTML = `
        <div style="text-align:center;padding:24px 0">
          <div style="font-size:48px;margin-bottom:14px;color:var(--primary)"><i class="fas fa-university"></i></div>
          <h3 style="margin-bottom:6px">Ordre de virement transmis</h3>
          <p style="color:var(--text-muted);font-size:.85rem">Connexion sécurisée au système bancaire ${banque}…</p>
          <div style="margin:16px auto;width:200px;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
            <div id="prog-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--primary),var(--success));border-radius:2px;transition:width 0.3s"></div>
          </div>
          <div id="prog-status" style="font-size:.78rem;color:var(--text-muted)">Initialisation du transfert ETEBAC…</div>
          <div id="prog-details" style="margin-top:14px;font-size:.75rem;color:var(--text-dim);display:none">
            <div><i class="fas fa-check-circle" style="color:var(--success)"></i> Authentification banque émettrice : OK</div>
            <div><i class="fas fa-check-circle" style="color:var(--success)"></i> Vérification IBAN : ${iban.substring(0,15)}…</div>
            <div><i class="fas fa-check-circle" style="color:var(--success)"></i> Contrôle solde : Disponible</div>
            <div><i class="fas fa-spinner" style="animation:spin 1s linear infinite"></i> Transmission en cours…</div>
          </div>
        </div>
      `;
      document.getElementById('modal-ft').innerHTML = '';

      const stages = [
        { p: 20, msg: 'Authentification banque émettrice…' },
        { p: 40, msg: 'Vérification du compte bénéficiaire…' },
        { p: 55, msg: 'Contrôle des fonds disponibles…' },
        { p: 70, msg: 'Validation du protocole ETEBAC…' },
        { p: 85, msg: 'Ordre de virement en cours d\'exécution…' },
      ];
      for (const s of stages) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        document.getElementById('prog-bar').style.width = s.p + '%';
        document.getElementById('prog-status').textContent = s.msg;
      }
      document.getElementById('prog-details').style.display = 'block';
      await new Promise(r => setTimeout(r, 500));
      document.getElementById('prog-bar').style.width = '100%';
      document.getElementById('prog-status').textContent = 'Virement effectué avec succès !';
      document.getElementById('prog-status').style.color = 'var(--success)';
      document.getElementById('prog-status').style.fontWeight = '700';
      document.getElementById('prog-details').innerHTML += '<div><i class="fas fa-check-circle" style="color:var(--success)"></i> <strong style="color:var(--success)">Virement transmis à la banque centrale</strong></div>';

      await new Promise(r => setTimeout(r, 600));
      document.getElementById('modal-ft').innerHTML = `
        <button class="btn btn-primary" onclick="Modal.close();loadFeuilles();loadRemboursements();viewFacture(${resultId})"><i class="fas fa-receipt"></i> Voir la facture</button>
      `;
    }
  } catch(e) {
    if (document.getElementById('r-err')) {
      document.getElementById('r-err').textContent = e.message;
      document.getElementById('r-err').classList.remove('hidden');
    } else {
      toast(e.message, 'error');
      Modal.close();
    }
  }
}

/* ── Effectuer un remboursement depuis la page ─────────── */
async function showEffectuerRemboursement() {
  try {
    const feuilles = await Api.getFeuilles({ statut: 'Validée' });
    if (!feuilles.length) {
      toast('Aucune feuille validée en attente de remboursement.', 'warning');
      return;
    }
    Modal.wide('Effectuer un remboursement', `
      <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Sélectionnez une feuille validée pour procéder au remboursement.</p>
      <div style="position:relative;margin-bottom:12px">
        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px"></i>
        <input class="search" id="q-remb-feuilles" placeholder="Référence, nom assuré, N° SS…" style="padding-left:32px;width:100%" oninput="filterRembFeuilles(this.value)"/>
      </div>
      <div style="max-height:360px;overflow-y:auto">
        <table class="tbl" id="tbl-remb-feuilles">
          <thead><tr><th>Référence</th><th>Assuré</th><th>N° SS</th><th>Montant</th><th></th></tr></thead>
          <tbody id="tbody-remb-feuilles">${feuilles.map(f => `
            <tr data-search="${(f.reference + ' ' + f.assure_nom + ' ' + f.numero_ss).toLowerCase()}">
              <td><code style="font-size:.8rem;color:var(--text-muted)">${f.reference}</code></td>
              <td>${f.assure_nom}</td>
              <td style="color:var(--text-muted)">${f.numero_ss}</td>
              <td style="font-weight:700;color:var(--success)">${fmtMoney(f.montant_remboursement)}</td>
              <td><button class="btn btn-sm btn-success" onclick="Modal.close();showRembourser(${f.id},'${f.reference}',${f.montant_remboursement},${f.assure_id},'${f.assure_nom.replace(/'/g, "\\'")}')"><i class="fas fa-credit-card"></i> Rembourser</button></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `, `<button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>`);
  } catch(e) { toast(e.message, 'error'); }
}

function filterRembFeuilles(val) {
  const q = val.toLowerCase();
  const tbody = document.getElementById('tbody-remb-feuilles');
  let visible = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    const match = tr.dataset.search.includes(q);
    tr.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const empty = tbody.querySelector('.empty-row');
  if (!visible) {
    if (!empty) tbody.insertAdjacentHTML('beforeend', '<tr class="empty-row"><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Aucune feuille correspondante</td></tr>');
  } else if (empty) {
    empty.remove();
  }
}

/* ── Impression de la facture ───────────────────────────── */
async function viewFacture(rembId) {
  try {
    const { remboursement: r, assure: a, feuille: f, medecin: m } = await Api.getFacture(rembId);
    Modal.wide(`Facture de remboursement : ${r.feuille_ref}`, `
      <div class="prt-title">FACTURE DE REMBOURSEMENT<br>
        <small style="font-size:.72rem;color:var(--text-muted)">Organisme de Sécurité Sociale : ENSPY</small>
      </div>
      <div class="prt-section">
        <h4>Assuré</h4>
        <div class="prt-row"><span class="prt-key">N° de Sécurité Sociale</span><span class="prt-val" style="color:var(--text-muted)">${a.numero_ss}</span></div>
        <div class="prt-row"><span class="prt-key">Bénéficiaire</span><span class="prt-val">${a.nom} ${a.prenom}</span></div>
        <div class="prt-row"><span class="prt-key">Date de naissance</span><span class="prt-val">${fmtDate(a.date_naissance)}</span></div>
        <div class="prt-row"><span class="prt-key">Adresse</span><span class="prt-val">${a.adresse || ''}</span></div>
      </div>
      <div class="prt-section">
        <h4>Consultation</h4>
        <div class="prt-row"><span class="prt-key">Référence feuille</span><span class="prt-val">${r.feuille_ref}</span></div>
        <div class="prt-row"><span class="prt-key">Date de consultation</span><span class="prt-val">${fmtDate(f.date_consultation)}</span></div>
        <div class="prt-row"><span class="prt-key">Médecin</span><span class="prt-val">Dr. ${m.nom} ${m.prenom} (${m.type})</span></div>
        <div class="prt-row"><span class="prt-key">Diagnostic</span><span class="prt-val">${f.diagnostic}</span></div>
        <div class="prt-row"><span class="prt-key">Actes réalisés</span><span class="prt-val">${f.actes_medicaux || ''}</span></div>
      </div>
      <div class="prt-section">
        <h4>Paiement</h4>
        <div class="prt-row"><span class="prt-key">Mode de paiement</span><span class="prt-val">${badgeMode(r.mode_paiement)}</span></div>
        ${r.reference_bancaire ? `<div class="prt-row"><span class="prt-key">Référence bancaire</span><span class="prt-val">${r.reference_bancaire}</span></div>` : ''}
        <div class="prt-row"><span class="prt-key">Date du remboursement</span><span class="prt-val">${fmtDateTime(r.date_remboursement)}</span></div>
      </div>
      <div class="prt-total">
        <span style="font-size:.95rem;font-weight:700">Montant total remboursé</span>
        <span class="prt-amount">${fmtMoney(r.montant)}</span>
      </div>
      <div style="text-align:center;font-size:.7rem;color:var(--text-dim);margin-top:16px">
        Document généré le ${fmtDateTime(new Date())} · ForInsurance : ENSPY 2025/2026
      </div>
    `, `
      <button class="btn btn-secondary" onclick="Modal.close()">Fermer</button>
      <button class="btn btn-primary" onclick="imprimerFacture()"><i class="fas fa-print"></i> Imprimer</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

function imprimerFacture() {
  const content = document.getElementById('modal-bd').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Facture de Remboursement : ForInsurance</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fff;color:#111;padding:32px;max-width:680px;margin:auto}
      .prt-title{font-size:1.05rem;font-weight:700;text-align:center;border-bottom:2px solid #28a745;padding-bottom:10px;margin-bottom:18px}
      .prt-section h4{font-size:.78rem;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px}
      .prt-row{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #dee2e6}
      .prt-key{min-width:150px;font-size:.82rem;color:#6c757d}
      .prt-val{font-size:.82rem;font-weight:500}
      .prt-total{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#d4edda;border-radius:4px;margin-top:14px}
      .prt-amount{font-size:1.4rem;font-weight:800;color:#28a745}
      .badge{display:inline-block;padding:2px 7px;border-radius:3px;font-size:.7rem;font-weight:600}
    </style>
  </head><body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

document.getElementById('q-remb').addEventListener('input', e => {
  clearTimeout(window._qr);
  const v = e.target.value;
  if (!v) { loadRemboursements(''); return; }
  window._qr = setTimeout(() => loadRemboursements(v), 300);
});

document.getElementById('btn-effectuer-remb').onclick = showEffectuerRemboursement;
